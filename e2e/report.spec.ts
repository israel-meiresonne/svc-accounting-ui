import { expect, test, type Page } from "@playwright/test"

/**
 * Same independence rule as the other e2e specs: each test signs up its
 * own fresh user rather than relying on any DB reset/seed step.
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

async function createAccount(page: Page, name: string, openingBalance: string, currency?: string) {
  await page.getByRole("button", { name: /new account/i }).click()
  await page.getByLabel("Account name").fill(name)
  if (currency) {
    await page.getByLabel("Currency", { exact: true }).click()
    await page.getByRole("option", { name: currency }).click()
  }
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

async function createTransaction(
  page: Page,
  { amount, category, description }: { amount: string; category: string; description: string }
) {
  await page.getByRole("button", { name: /new transaction/i }).click()
  await page.locator('input[type="datetime-local"]').fill(nowForDatetimeLocal())
  await page.getByPlaceholder("-24.90").fill(amount)
  await page.getByLabel("Category").fill(category)
  await page.getByLabel("Payment method").click()
  await page.getByRole("option", { name: "Credit card" }).click()
  await page.getByLabel("Search counterparties").fill(`Report-${category}`)
  await page.getByRole("button", { name: `Create new: Report-${category}` }).click()
  await page.getByLabel("First name").fill(`Report-${category}`)
  await page.getByLabel("Last name").fill("Doe")
  await page.getByLabel("Description").fill(description)
  await page.getByRole("button", { name: /create_transaction/i }).click()
  await expect(page.getByRole("dialog")).not.toBeVisible()
}

function rowByDescription(page: Page, description: string) {
  return page.locator("tbody tr", { hasText: description })
}

async function selectRow(page: Page, description: string) {
  await rowByDescription(page, description).getByRole("checkbox", { name: "Select row" }).check()
}

async function readDownloadHeader(download: Awaited<ReturnType<Page["waitForEvent"]>> & { path(): Promise<string> }) {
  const fs = await import("node:fs/promises")
  const path = await download.path()
  if (!path) throw new Error("download has no local path")
  const buffer = await fs.readFile(path)
  return buffer.subarray(0, 5).toString("latin1")
}

test.describe("PDF report generation", () => {
  test("generating a report for a single-currency selection downloads a real PDF", async ({ page }) => {
    const id = uniqueId()
    const category = `ReportCat-${id}`
    const description = `Report tx ${id}`

    await signUp(page, uniqueUser())
    await createAccount(page, "Everyday Checking", "1000")
    await openAccount(page, "Everyday Checking")
    await createTransaction(page, { amount: "-15", category, description })

    await page.getByRole("link", { name: "Transactions" }).click()
    await expect(rowByDescription(page, description)).toBeVisible()
    await selectRow(page, description)

    await page.getByRole("button", { name: "Generate PDF report" }).click()
    const dialog = page.getByRole("dialog")
    // The single-currency case never shows the reporting-currency picker.
    await expect(dialog.getByLabel("Reporting currency")).toHaveCount(0)
    await dialog.getByLabel("Report title").fill(`Report ${id}`)
    await dialog.getByLabel("Report description").fill("A single-currency e2e report")

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      dialog.getByRole("button", { name: /generate pdf/i }).click(),
    ])
    expect(download.suggestedFilename()).toBe("report.pdf")
    expect(await readDownloadHeader(download)).toBe("%PDF-")
    await expect(page.getByRole("dialog")).not.toBeVisible()
  })

  test("a mixed-currency selection requires a reporting currency and still downloads a real PDF", async ({ page }) => {
    const id = uniqueId()
    const categoryUsd = `ReportUsd-${id}`
    const categoryEur = `ReportEur-${id}`
    const descUsd = `Report USD tx ${id}`
    const descEur = `Report EUR tx ${id}`

    await signUp(page, uniqueUser())
    await createAccount(page, "Everyday Checking", "1000")
    await createAccount(page, "Paris Trip Fund", "250", "EUR")

    await openAccount(page, "Everyday Checking")
    await createTransaction(page, { amount: "-15", category: categoryUsd, description: descUsd })
    await page.getByRole("link", { name: "Accounts" }).click()
    await openAccount(page, "Paris Trip Fund")
    await createTransaction(page, { amount: "-10", category: categoryEur, description: descEur })

    await page.getByRole("link", { name: "Transactions" }).click()
    await expect(rowByDescription(page, descUsd)).toBeVisible()
    await expect(rowByDescription(page, descEur)).toBeVisible()
    await selectRow(page, descUsd)
    await selectRow(page, descEur)

    await page.getByRole("button", { name: "Generate PDF report" }).click()
    const dialog = page.getByRole("dialog")
    await dialog.getByLabel("Report title").fill(`Mixed report ${id}`)
    await dialog.getByLabel("Report description").fill("A mixed-currency e2e report")

    // Mixed currencies: the picker must appear, and must actually let the
    // user choose a reporting currency rather than silently guessing one.
    await expect(dialog.getByLabel("Reporting currency")).toBeVisible()
    await dialog.getByLabel("Reporting currency").click()
    await page.getByRole("option", { name: "EUR" }).click()

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      dialog.getByRole("button", { name: /generate pdf/i }).click(),
    ])
    expect(download.suggestedFilename()).toBe("report.pdf")
    expect(await readDownloadHeader(download)).toBe("%PDF-")
    await expect(page.getByRole("dialog")).not.toBeVisible()
  })
})
