import { expect, test, type Page } from "@playwright/test"

/**
 * Same independence rule as e2e/auth.spec.ts and e2e/accounts.spec.ts:
 * each test signs up its own fresh user rather than relying on any DB
 * reset/seed step.
 */
function uniqueId(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`
}

function uniqueUser() {
  const id = uniqueId()

  return {
    firstName: "Priya",
    lastName: "Nair",
    email: `priya+${id}@nimbus.dev`,
    password: "hunter2000",
  }
}

async function signUp(page: Page, user: ReturnType<typeof uniqueUser>) {
  await page.goto("/signup")
  await page.getByLabel("First name").fill(user.firstName)
  await page.getByLabel("Last name").fill(user.lastName)
  await page.getByLabel("Email").fill(user.email)
  await page.getByLabel("Password", { exact: true }).fill(user.password)
  await page.getByLabel("Confirm password").fill(user.password)
  await page.getByRole("button", { name: /create_account/i }).click()
  await expect(page).toHaveURL(/\/accounts$/)
}

// Mirrors lib/money.ts's formatMoney exactly, so the expected string is
// computed the same way in the same environment/locale as the app under test.
function formatMoney(amount: string | number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(Number(amount))
}

async function createAccount(page: Page, name: string, openingBalance: string) {
  await page.getByRole("button", { name: /new account/i }).click()
  await page.getByLabel("Account name").fill(name)
  await page.getByLabel("Opening balance (as of account creation)").fill(openingBalance)
  await page.getByRole("button", { name: /create_account/i }).click()
  await expect(page.getByRole("dialog")).not.toBeVisible()
}

function accountCard(page: Page, name: string) {
  return page.locator('[data-slot="card"]').filter({ hasText: name })
}

async function openAccount(page: Page, name: string) {
  await accountCard(page, name).getByText(name).click()
  await expect(page).toHaveURL(/\/accounts\/acc_/)
}

/** `<input type="datetime-local">`'s expected value shape, for "now". */
function nowForDatetimeLocal(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
}

function transactionRow(page: Page, category: string) {
  return page.locator("tbody tr", { hasText: category })
}

/**
 * Fills every required field of the transaction form except the
 * counterparty, which each test wires up itself since create-new vs.
 * search-existing are exactly what's under test.
 */
async function fillTransactionBasics(page: Page, { amount, category }: { amount: string; category: string }) {
  await page.locator('input[type="datetime-local"]').fill(nowForDatetimeLocal())
  await page.getByPlaceholder("-24.90").fill(amount)
  await page.getByLabel("Category").fill(category)
  await page.getByLabel("Payment method").click()
  await page.getByRole("option", { name: "Credit card" }).click()
}

/** The well-behaved path through CounterpartyPicker's "create new" flow: both name fields filled in. */
async function createNewContactCounterparty(page: Page, firstName: string, lastName: string) {
  await page.getByLabel("Search counterparties").fill(firstName)
  await page.getByRole("button", { name: `Create new: ${firstName}` }).click()
  await page.getByLabel("First name").fill(firstName)
  await page.getByLabel("Last name").fill(lastName)
}

test.describe("transactions", () => {
  test("creating a transaction shows it in the account's list and updates the account's balance", async ({
    page,
  }) => {
    const id = uniqueId()
    const category = `Groceries-${id}`
    await signUp(page, uniqueUser())
    await createAccount(page, "Everyday Checking", "1000")
    await openAccount(page, "Everyday Checking")

    await page.getByRole("button", { name: /new transaction/i }).click()
    await fillTransactionBasics(page, { amount: "-42.50", category })
    await createNewContactCounterparty(page, `Jordan-${id}`, "Lee")
    await page.getByLabel("Description").fill("Weekly shop")
    await page.getByRole("button", { name: /create_transaction/i }).click()

    await expect(page.getByRole("dialog")).not.toBeVisible()
    const row = transactionRow(page, category)
    await expect(row).toBeVisible()
    await expect(row.getByText(formatMoney(-42.5, "usd"))).toBeVisible()
    await expect(row.getByText("Credit card")).toBeVisible()
    await expect(row.getByText(`Jordan-${id} Lee`)).toBeVisible()

    await page.getByRole("link", { name: "Accounts" }).click()
    await expect(accountCard(page, "Everyday Checking").getByText(formatMoney(957.5, "usd"))).toBeVisible()
  })

  test("editing a transaction's category and amount updates the list and the account's balance", async ({
    page,
  }) => {
    const id = uniqueId()
    const originalCategory = `Old-Category-${id}`
    const newCategory = `New-Category-${id}`
    await signUp(page, uniqueUser())
    await createAccount(page, "Everyday Checking", "1000")
    await openAccount(page, "Everyday Checking")

    await page.getByRole("button", { name: /new transaction/i }).click()
    await fillTransactionBasics(page, { amount: "-10", category: originalCategory })
    await createNewContactCounterparty(page, `Sam-${id}`, "Ortiz")
    await page.getByRole("button", { name: /create_transaction/i }).click()
    await expect(page.getByRole("dialog")).not.toBeVisible()
    await expect(transactionRow(page, originalCategory)).toBeVisible()

    await transactionRow(page, originalCategory).click()
    await page.getByLabel("Category").fill(newCategory)
    await page.getByPlaceholder("-24.90").fill("-25")
    await page.getByRole("button", { name: /save_changes/i }).click()

    await expect(page.getByRole("dialog")).not.toBeVisible()
    await expect(transactionRow(page, newCategory)).toBeVisible()
    await expect(transactionRow(page, newCategory).getByText(formatMoney(-25, "usd"))).toBeVisible()
    await expect(page.locator("tbody tr", { hasText: originalCategory })).toHaveCount(0)

    await page.getByRole("link", { name: "Accounts" }).click()
    await expect(accountCard(page, "Everyday Checking").getByText(formatMoney(975, "usd"))).toBeVisible()
  })

  test("deleting a transaction removes it from the list and it stays gone after reload", async ({
    page,
  }) => {
    const id = uniqueId()
    const category = `Throwaway-${id}`
    await signUp(page, uniqueUser())
    await createAccount(page, "Everyday Checking", "1000")
    await openAccount(page, "Everyday Checking")

    await page.getByRole("button", { name: /new transaction/i }).click()
    await fillTransactionBasics(page, { amount: "-5", category })
    await createNewContactCounterparty(page, `Robin-${id}`, "Diaz")
    await page.getByRole("button", { name: /create_transaction/i }).click()
    await expect(page.getByRole("dialog")).not.toBeVisible()
    await expect(transactionRow(page, category)).toBeVisible()

    await transactionRow(page, category).click()
    await page.getByRole("button", { name: /delete transaction/i }).click()

    await expect(transactionRow(page, category)).toHaveCount(0)

    await page.reload()
    await expect(transactionRow(page, category)).toHaveCount(0)
  })

  test("searching an existing counterparty lets you pick it instead of creating a new one", async ({
    page,
  }) => {
    const id = uniqueId()
    const firstName = `Unique-${id}`
    await signUp(page, uniqueUser())
    await createAccount(page, "Everyday Checking", "1000")
    await openAccount(page, "Everyday Checking")

    // First transaction: create the counterparty from scratch.
    await page.getByRole("button", { name: /new transaction/i }).click()
    await fillTransactionBasics(page, { amount: "-10", category: `First-${id}` })
    await createNewContactCounterparty(page, firstName, "Kade")
    await page.getByRole("button", { name: /create_transaction/i }).click()
    await expect(page.getByRole("dialog")).not.toBeVisible()

    // Second transaction: find that same counterparty through search.
    await page.getByRole("button", { name: /new transaction/i }).click()
    await fillTransactionBasics(page, { amount: "-20", category: `Second-${id}` })
    await page.getByLabel("Search counterparties").fill(firstName)
    await expect(page.getByRole("button", { name: `${firstName} Kade` })).toBeVisible()
    await page.getByRole("button", { name: `${firstName} Kade` }).click()
    await expect(page.getByTestId("selected-counterparty")).toHaveText(`${firstName} Kade`)
    await page.getByRole("button", { name: /create_transaction/i }).click()

    await expect(page.getByRole("dialog")).not.toBeVisible()
    await expect(transactionRow(page, `Second-${id}`).getByText(`${firstName} Kade`)).toBeVisible()
  })

  test("filtering by category and by payment method on the Transactions page narrows the list", async ({
    page,
  }) => {
    const id = uniqueId()
    const groceriesCategory = `Groceries-${id}`
    const rentCategory = `Rent-${id}`
    await signUp(page, uniqueUser())
    await createAccount(page, "Everyday Checking", "1000")
    await openAccount(page, "Everyday Checking")

    await page.getByRole("button", { name: /new transaction/i }).click()
    await fillTransactionBasics(page, { amount: "-30", category: groceriesCategory })
    await createNewContactCounterparty(page, `Alex-${id}`, "Ng")
    await page.getByRole("button", { name: /create_transaction/i }).click()
    await expect(page.getByRole("dialog")).not.toBeVisible()

    await page.getByRole("button", { name: /new transaction/i }).click()
    await page.locator('input[type="datetime-local"]').fill(nowForDatetimeLocal())
    await page.getByPlaceholder("-24.90").fill("-900")
    await page.getByLabel("Category").fill(rentCategory)
    await page.getByLabel("Payment method").click()
    await page.getByRole("option", { name: "Bank transfer" }).click()
    await createNewContactCounterparty(page, `Landlord-${id}`, "Corp")
    await page.getByRole("button", { name: /create_transaction/i }).click()
    await expect(page.getByRole("dialog")).not.toBeVisible()

    await page.getByRole("link", { name: "Transactions" }).click()
    await expect(page.locator("tbody tr", { hasText: groceriesCategory })).toBeVisible()
    await expect(page.locator("tbody tr", { hasText: rentCategory })).toBeVisible()

    await page.getByLabel("Filter by category").fill(groceriesCategory)
    await expect(page.locator("tbody tr", { hasText: groceriesCategory })).toBeVisible()
    await expect(page.locator("tbody tr", { hasText: rentCategory })).toHaveCount(0)

    await page.getByLabel("Filter by category").fill("")
    await page.getByLabel("Filter by payment method").click()
    await page.getByRole("option", { name: "Bank transfer" }).click()
    await expect(page.locator("tbody tr", { hasText: rentCategory })).toBeVisible()
    await expect(page.locator("tbody tr", { hasText: groceriesCategory })).toHaveCount(0)
  })

  test("creating a contact counterparty without a last name shows a validation error instead of crashing", async ({
    page,
  }) => {
    const id = uniqueId()
    await signUp(page, uniqueUser())
    await createAccount(page, "Everyday Checking", "1000")
    await openAccount(page, "Everyday Checking")

    await page.getByRole("button", { name: /new transaction/i }).click()
    await fillTransactionBasics(page, { amount: "-10", category: `Solo-${id}` })
    // Deliberately leave Last name blank: the picker's quick "create new"
    // flow pre-fills only First name from the search box's text.
    await page.getByLabel("Search counterparties").fill(`Solo-${id}`)
    await page.getByRole("button", { name: `Create new: Solo-${id}` }).click()
    await page.getByRole("button", { name: /create_transaction/i }).click()

    // Scoped to the toast container: the picker's own "Last name" field
    // label is always on screen at this point regardless of the submit
    // outcome, so asserting on page-wide text here would pass either way.
    await expect(page.locator("[data-sonner-toaster]")).toContainText(/last name/i)
    await expect(page.getByRole("dialog")).toBeVisible()
    await expect(transactionRow(page, `Solo-${id}`)).toHaveCount(0)
  })
})
