import { expect, test, type Page } from "@playwright/test"

/**
 * Same independence rule as e2e/auth.spec.ts, e2e/accounts.spec.ts, and
 * e2e/transactions.spec.ts: each test signs up its own fresh user rather
 * than relying on any DB reset/seed step.
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

/**
 * Creates one transaction on the currently open account with a brand new
 * contact counterparty. `amount` follows the app's own sign convention
 * (positive = income, negative = expense), matching CalculateStats and
 * Statistics::Aggregate on the backend.
 */
async function createTransaction(
  page: Page,
  { amount, category, counterpartyFirstName }: { amount: string; category: string; counterpartyFirstName: string }
) {
  await page.getByRole("button", { name: /new transaction/i }).click()
  await page.locator('input[type="datetime-local"]').fill(nowForDatetimeLocal())
  await page.getByPlaceholder("-24.90").fill(amount)
  await page.getByLabel("Category").fill(category)
  await page.getByLabel("Payment method").click()
  await page.getByRole("option", { name: "Credit card" }).click()
  await page.getByLabel("Search counterparties").fill(counterpartyFirstName)
  await page.getByRole("button", { name: `Create new: ${counterpartyFirstName}` }).click()
  await page.getByLabel("First name").fill(counterpartyFirstName)
  await page.getByLabel("Last name").fill("Doe")
  await page.getByRole("button", { name: /create_transaction/i }).click()
  await expect(page.getByRole("dialog")).not.toBeVisible()
}

/** Both `ChartCard` (Statistics page) and `StatsTiles`' `Card` (Account page) render `[data-slot="card"]`. */
function cardWithLabel(page: Page, label: string) {
  return page.locator('[data-slot="card"]').filter({ hasText: label })
}

async function goToStatistics(page: Page) {
  const responsePromise = page.waitForResponse(
    (response) => response.url().includes("/api/v1/statistics") && response.request().method() === "GET"
  )
  await page.getByRole("link", { name: "Statistics" }).click()
  const response = await responsePromise
  return response.json()
}

test.describe("statistics", () => {
  test("the cross-account Statistics page aggregates income and expenses by category and every chart renders", async ({
    page,
  }) => {
    const id = uniqueId()
    const salaryCategory = `Salary-${id}`
    const groceriesCategory = `Groceries-${id}`
    const rentCategory = `Rent-${id}`

    await signUp(page, uniqueUser())
    await createAccount(page, "Everyday Checking", "0")
    await openAccount(page, "Everyday Checking")

    await createTransaction(page, { amount: "1500", category: salaryCategory, counterpartyFirstName: `Employer-${id}` })
    await createTransaction(page, { amount: "-300", category: groceriesCategory, counterpartyFirstName: `Store-${id}` })
    await createTransaction(page, { amount: "-700", category: rentCategory, counterpartyFirstName: `Landlord-${id}` })

    const body = await goToStatistics(page)

    // Exact aggregation correctness, read from the real API response the
    // real UI just triggered — the accounting logic itself doesn't depend
    // on "today", but the forecast below does, so that one is checked
    // against the API's own value instead of an independently rederived one.
    expect(body.currency).toBe("usd")
    expect(Number(body.current.total_income)).toBe(1500)
    expect(Number(body.current.total_expenses)).toBe(1000)
    expect(Number(body.current.net_balance)).toBe(500)

    const incomeEntry = body.current.income_by_category.find((entry: { category: string }) => entry.category === salaryCategory)
    expect(Number(incomeEntry.amount)).toBe(1500)

    const groceriesEntry = body.current.expenses_by_category.find(
      (entry: { category: string }) => entry.category === groceriesCategory
    )
    expect(Number(groceriesEntry.amount)).toBe(300)

    const rentEntry = body.current.expenses_by_category.find((entry: { category: string }) => entry.category === rentCategory)
    expect(Number(rentEntry.amount)).toBe(700)

    // The current month always contains "today", so a forecast should
    // always be produced (never the "interval hasn't started yet" branch).
    expect(body.current.forecast_net_balance).not.toBeNull()

    await expect(page.getByText(/couldn't load statistics/i)).toHaveCount(0)

    await expect(cardWithLabel(page, "Total income").getByText(formatMoney(1500, "usd"))).toBeVisible()
    await expect(cardWithLabel(page, "Total expenses").getByText(formatMoney(1000, "usd"))).toBeVisible()
    await expect(cardWithLabel(page, "Net balance").getByText(formatMoney(500, "usd"))).toBeVisible()
    await expect(
      cardWithLabel(page, "Net balance forecast").getByText(
        `${formatMoney(body.current.forecast_net_balance, body.currency)} projected`
      )
    ).toBeVisible()

    for (const title of ["Income vs expenses", "Income by category", "Expenses by category", "Income vs expenses by category"]) {
      await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible()
    }
  })

  test("filtering the Statistics page by category narrows the aggregation to just that category", async ({ page }) => {
    const id = uniqueId()
    const groceriesCategory = `Groceries-${id}`
    const rentCategory = `Rent-${id}`

    await signUp(page, uniqueUser())
    await createAccount(page, "Everyday Checking", "0")
    await openAccount(page, "Everyday Checking")

    await createTransaction(page, { amount: "-300", category: groceriesCategory, counterpartyFirstName: `Store-${id}` })
    await createTransaction(page, { amount: "-700", category: rentCategory, counterpartyFirstName: `Landlord-${id}` })

    const unfiltered = await goToStatistics(page)
    expect(Number(unfiltered.current.total_expenses)).toBe(1000)

    const filteredResponsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/v1/statistics") && response.request().method() === "GET"
    )
    await page.getByLabel("Filter by category").fill(groceriesCategory)
    await page.getByLabel("Filter by category").press("Enter")
    const filtered = await (await filteredResponsePromise).json()

    expect(Number(filtered.current.total_expenses)).toBe(300)
    expect(filtered.current.expenses_by_category).toHaveLength(1)
    expect(filtered.current.expenses_by_category[0].category).toBe(groceriesCategory)

    await expect(cardWithLabel(page, "Total expenses").getByText(formatMoney(300, "usd"))).toBeVisible()
  })

  test("the account page's stat tiles reflect income and expenses within the selected interval", async ({ page }) => {
    const id = uniqueId()
    const incomeCategory = `Freelance-${id}`
    const expenseCategory = `Utilities-${id}`

    await signUp(page, uniqueUser())
    await createAccount(page, "Everyday Checking", "0")
    await openAccount(page, "Everyday Checking")

    await createTransaction(page, { amount: "800", category: incomeCategory, counterpartyFirstName: `Client-${id}` })
    await createTransaction(page, { amount: "-250", category: expenseCategory, counterpartyFirstName: `Utility-${id}` })

    await expect(cardWithLabel(page, "Total income").getByText(formatMoney(800, "usd"))).toBeVisible()
    await expect(cardWithLabel(page, "Total expenses").getByText(formatMoney(250, "usd"))).toBeVisible()
    await expect(cardWithLabel(page, "Net balance").getByText(formatMoney(550, "usd"))).toBeVisible()
  })
})
