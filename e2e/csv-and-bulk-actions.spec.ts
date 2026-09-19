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

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

/** A row identified by its (unique) description, stable even when a test changes the row's category. */
function rowByDescription(page: Page, description: string) {
  return page.locator("tbody tr", { hasText: description })
}

async function fillTransactionBasics(page: Page, { amount, category }: { amount: string; category: string }) {
  await page.locator('input[type="datetime-local"]').fill(nowForDatetimeLocal())
  await page.getByPlaceholder("-24.90").fill(amount)
  await page.getByLabel("Category").fill(category)
  await page.getByLabel("Payment method").click()
  await page.getByRole("option", { name: "Credit card" }).click()
}

async function createNewContactCounterparty(page: Page, firstName: string, lastName: string) {
  await page.getByLabel("Search counterparties").fill(firstName)
  await page.getByRole("button", { name: `Create new: ${firstName}` }).click()
  await page.getByLabel("First name").fill(firstName)
  await page.getByLabel("Last name").fill(lastName)
}

async function selectRow(page: Page, description: string) {
  await rowByDescription(page, description).getByRole("checkbox", { name: "Select row" }).check()
}

test.describe("CSV import", () => {
  test("uploading a CSV previews the rows and commits them into real transactions", async ({ page }) => {
    const id = uniqueId()
    const categoryA = `CsvGroceries-${id}`
    const categoryB = `CsvCoffee-${id}`
    const date = todayIsoDate()

    await signUp(page, uniqueUser())
    await createAccount(page, "Everyday Checking", "1000")

    const csv = [
      "occurred_at,amount,currency,payment_method,category,description,counterparty_type,counterparty_name,counterparty_email",
      `${date},-45.20,usd,credit_card,${categoryA},CSV imported groceries,contact,Jordan-${id} Lee,`,
      `${date},-12.00,usd,cash,${categoryB},CSV imported coffee,contact,Alex-${id} Ng,`,
    ].join("\n")

    await page.getByRole("button", { name: /upload csv/i }).click()
    await page.getByLabel(/drop a file here or click to browse/i).setInputFiles({
      name: "export.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv),
    })

    // No `account` column in this CSV, so the mapping step renders a single
    // "Target account" picker, already defaulted to the only account that exists.
    await page.getByRole("button", { name: /continue/i }).click()

    const previewRowA = page.locator("tbody tr", { hasText: categoryA })
    const previewRowB = page.locator("tbody tr", { hasText: categoryB })
    await expect(previewRowA).toBeVisible()
    await expect(previewRowA).toContainText(/ok/i)
    await expect(previewRowB).toBeVisible()
    await expect(previewRowB).toContainText(/ok/i)

    await page.getByRole("button", { name: /import_2_transactions/i }).click()
    await expect(page.getByText("Imported 2 transaction(s).")).toBeVisible()
    await page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }).first().click()
    await expect(page.getByRole("dialog")).not.toBeVisible()

    await openAccount(page, "Everyday Checking")
    const rowA = page.locator("tbody tr", { hasText: categoryA })
    const rowB = page.locator("tbody tr", { hasText: categoryB })
    await expect(rowA).toBeVisible()
    await expect(rowA.getByText("Jordan-" + id + " Lee")).toBeVisible()
    await expect(rowB).toBeVisible()
    await expect(rowB.getByText("Alex-" + id + " Ng")).toBeVisible()

    await page.getByRole("link", { name: "Accounts" }).click()
    // 1000 - 45.20 - 12.00 = 942.80
    await expect(
      accountCard(page, "Everyday Checking").getByText(
        new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(942.8)
      )
    ).toBeVisible()
  })
})

test.describe("bulk transaction actions", () => {
  test("bulk update, move, CSV export, and delete all apply to exactly the selected rows", async ({ page }) => {
    const id = uniqueId()
    const descA = `Desc-A-${id}`
    const descB = `Desc-B-${id}`
    const descC = `Desc-C-${id}`
    const catA = `Cat-A-${id}`
    const catB = `Cat-B-${id}`
    const catC = `Cat-C-${id}`
    const sharedCategory = `Bulk-Updated-${id}`

    await signUp(page, uniqueUser())
    await createAccount(page, "Everyday Checking", "1000")
    await createAccount(page, "Savings", "500")
    await openAccount(page, "Everyday Checking")

    for (const [amount, category, description, name] of [
      ["-10", catA, descA, `Alpha-${id}`],
      ["-20", catB, descB, `Bravo-${id}`],
      ["-30", catC, descC, `Charlie-${id}`],
    ] as const) {
      await page.getByRole("button", { name: /new transaction/i }).click()
      await fillTransactionBasics(page, { amount, category })
      await createNewContactCounterparty(page, name, "Doe")
      await page.getByLabel("Description").fill(description)
      await page.getByRole("button", { name: /create_transaction/i }).click()
      await expect(page.getByRole("dialog")).not.toBeVisible()
    }

    await page.getByRole("link", { name: "Transactions" }).click()
    await expect(rowByDescription(page, descA)).toBeVisible()
    await expect(rowByDescription(page, descB)).toBeVisible()
    await expect(rowByDescription(page, descC)).toBeVisible()

    // --- bulk update: A and B get a shared category, C is untouched ---
    await selectRow(page, descA)
    await selectRow(page, descB)
    await page.getByRole("button", { name: "Update properties" }).click()
    await page.getByRole("dialog").getByLabel("Category").fill(sharedCategory)
    await page.getByRole("button", { name: /update 2 transactions/i }).click()
    await expect(page.getByText(/updated 2 transactions?\./i)).toBeVisible()

    await expect(rowByDescription(page, descA)).toContainText(sharedCategory)
    await expect(rowByDescription(page, descB)).toContainText(sharedCategory)
    await expect(rowByDescription(page, descC)).toContainText(catC)

    // --- bulk move: only A moves to Savings ---
    await selectRow(page, descA)
    await page.getByRole("button", { name: "Move to another account" }).click()
    await page.getByLabel("Destination account").click()
    await page.getByRole("option", { name: /savings/i }).click()
    await page.getByRole("button", { name: /move 1 transaction/i }).click()
    await expect(page.getByText(/moved 1 transaction\./i)).toBeVisible()

    await expect(rowByDescription(page, descA)).toContainText("Savings")
    await expect(rowByDescription(page, descB)).toContainText("Everyday Checking")
    await expect(rowByDescription(page, descC)).toContainText("Everyday Checking")

    // --- bulk export: triggers a real file download ---
    await selectRow(page, descB)
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Export CSV" }).click(),
    ])
    expect(download.suggestedFilename()).toBe("transactions.csv")

    // --- bulk delete: only C is removed, and it stays gone after reload ---
    // Export doesn't clear the selection (unlike update/move/delete), so B is
    // still checked here and must be explicitly deselected first.
    await rowByDescription(page, descB).getByRole("checkbox", { name: "Select row" }).uncheck()
    await selectRow(page, descC)
    await page.getByRole("button", { name: "Delete" }).click()
    await page.getByRole("button", { name: /delete 1 transaction/i }).click()
    await expect(page.getByText(/deleted 1 transaction\./i)).toBeVisible()
    await expect(rowByDescription(page, descC)).toHaveCount(0)

    await page.reload()
    await expect(rowByDescription(page, descC)).toHaveCount(0)
    await expect(rowByDescription(page, descA)).toContainText("Savings")
    await expect(rowByDescription(page, descB)).toBeVisible()
  })
})
