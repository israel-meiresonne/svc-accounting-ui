import { expect, test, type Page } from "@playwright/test"

/**
 * Same independence rule as e2e/auth.spec.ts: each test signs up its own
 * fresh user rather than relying on any DB reset/seed step.
 */
function uniqueUser() {
  const id = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`

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

// AccountCard renders as components/ui/card's root, which always carries
// data-slot="card" — a stable hook instead of guessing DOM nesting depth.
function accountCard(page: Page, name: string) {
  return page.locator('[data-slot="card"]').filter({ hasText: name })
}

test.describe("accounts", () => {
  test("creating an account shows it in the list with the right balance and currency", async ({
    page,
  }) => {
    await signUp(page, uniqueUser())

    await page.getByRole("button", { name: /new account/i }).click()
    await page.getByLabel("Account name").fill("Everyday Checking")
    await page.getByLabel("Opening balance (as of account creation)").fill("1000")
    await page.getByRole("button", { name: /create_account/i }).click()
    await expect(page.getByRole("dialog")).not.toBeVisible()

    // The badge's text content is the raw lowercase code; "uppercase" in
    // its className is a CSS text-transform, which doesn't change the
    // underlying text a11y/text queries match against.
    const card = accountCard(page, "Everyday Checking")
    await expect(card.getByText("usd", { exact: true })).toBeVisible()
    await expect(card.getByText(formatMoney(1000, "usd"))).toBeVisible()
  })

  test("creating a non-default-currency account displays it in that currency", async ({
    page,
  }) => {
    await signUp(page, uniqueUser())

    await page.getByRole("button", { name: /new account/i }).click()
    await page.getByLabel("Account name").fill("Paris Trip Fund")
    // getByLabel does a substring match by default, and "Currency" is a
    // substring of the main-currency setting's "Main currency" label too.
    await page.getByLabel("Currency", { exact: true }).click()
    await page.getByRole("option", { name: "EUR" }).click()
    await page.getByLabel("Opening balance (as of account creation)").fill("250")
    await page.getByRole("button", { name: /create_account/i }).click()
    await expect(page.getByRole("dialog")).not.toBeVisible()

    const card = accountCard(page, "Paris Trip Fund")
    await expect(card.getByText("eur", { exact: true })).toBeVisible()
    await expect(card.getByText(formatMoney(250, "eur"))).toBeVisible()
  })

  test("editing an account's name updates the list", async ({ page }) => {
    await signUp(page, uniqueUser())

    await page.getByRole("button", { name: /new account/i }).click()
    await page.getByLabel("Account name").fill("Old Name")
    await page.getByLabel("Opening balance (as of account creation)").fill("100")
    await page.getByRole("button", { name: /create_account/i }).click()
    await expect(page.getByRole("dialog")).not.toBeVisible()
    await expect(accountCard(page, "Old Name")).toBeVisible()

    await accountCard(page, "Old Name").getByRole("button", { name: "Edit" }).click()
    await page.getByLabel("Account name").fill("New Name")
    await page.getByRole("button", { name: /save_changes/i }).click()
    await expect(page.getByRole("dialog")).not.toBeVisible()

    await expect(accountCard(page, "New Name")).toBeVisible()
    await expect(accountCard(page, "Old Name")).toHaveCount(0)
  })

  test("deleting an account removes it from the list and it stays gone after reload", async ({
    page,
  }) => {
    await signUp(page, uniqueUser())

    await page.getByRole("button", { name: /new account/i }).click()
    await page.getByLabel("Account name").fill("Throwaway Savings")
    await page.getByLabel("Opening balance (as of account creation)").fill("50")
    await page.getByRole("button", { name: /create_account/i }).click()
    await expect(page.getByRole("dialog")).not.toBeVisible()
    await expect(accountCard(page, "Throwaway Savings")).toBeVisible()

    await accountCard(page, "Throwaway Savings").getByRole("button", { name: "Delete" }).click()
    await page.getByRole("button", { name: /delete_account/i }).click()
    await expect(page.getByRole("dialog")).not.toBeVisible()

    await expect(accountCard(page, "Throwaway Savings")).toHaveCount(0)

    await page.reload()
    await expect(accountCard(page, "Throwaway Savings")).toHaveCount(0)
  })
})
