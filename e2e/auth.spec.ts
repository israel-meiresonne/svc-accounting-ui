import { expect, test } from "@playwright/test"

/**
 * Each test signs up its own user with a unique email, rather than
 * relying on any DB reset/seed step, so tests stay independent of each
 * other and of whatever's already in the dev database.
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

async function signUp(page: import("@playwright/test").Page, user: ReturnType<typeof uniqueUser>) {
  await page.goto("/signup")
  await page.getByLabel("First name").fill(user.firstName)
  await page.getByLabel("Last name").fill(user.lastName)
  await page.getByLabel("Email").fill(user.email)
  await page.getByLabel("Password", { exact: true }).fill(user.password)
  await page.getByLabel("Confirm password").fill(user.password)
  await page.getByRole("button", { name: /create_account/i }).click()
}

test.describe("auth", () => {
  test("signup creates an account and lands the user in the app", async ({ page }) => {
    const user = uniqueUser()

    await signUp(page, user)

    await expect(page).toHaveURL(/\/accounts$/)
    await expect(page.getByRole("link", { name: "Accounts" })).toHaveAttribute(
      "aria-current",
      "page"
    )
  })

  test("login with valid credentials lands the user in the app", async ({ page }) => {
    const user = uniqueUser()
    await signUp(page, user)
    await page.getByRole("button", { name: /log out/i }).click()
    await expect(page).toHaveURL(/\/login$/)

    await page.getByLabel("Email").fill(user.email)
    await page.getByLabel("Password").fill(user.password)
    await page.getByRole("button", { name: /log_in/i }).click()

    await expect(page).toHaveURL(/\/accounts$/)
  })

  test("login with wrong credentials shows an inline error and does not navigate", async ({
    page,
  }) => {
    const user = uniqueUser()
    await signUp(page, user)
    await page.getByRole("button", { name: /log out/i }).click()
    await expect(page).toHaveURL(/\/login$/)

    await page.getByLabel("Email").fill(user.email)
    await page.getByLabel("Password").fill("wrong-password")
    await page.getByRole("button", { name: /log_in/i }).click()

    // Scoped to the form's own error banner: Next's route announcer also
    // carries role="alert" and would otherwise make this locator ambiguous.
    await expect(page.getByRole("alert").filter({ hasText: /incorrect/i })).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
  })

  test("session persists across a page reload", async ({ page }) => {
    const user = uniqueUser()
    await signUp(page, user)
    await expect(page).toHaveURL(/\/accounts$/)

    await page.reload()

    await expect(page).toHaveURL(/\/accounts$/)
    await expect(page.getByRole("link", { name: "Accounts" })).toBeVisible()
  })

  test("an unauthenticated visit to a protected route redirects to login", async ({ page }) => {
    await page.goto("/accounts")

    await expect(page).toHaveURL(/\/login$/)
  })

  test("logout clears the session and blocks access back to a protected route", async ({
    page,
  }) => {
    const user = uniqueUser()
    await signUp(page, user)

    await page.getByRole("button", { name: /log out/i }).click()
    await expect(page).toHaveURL(/\/login$/)

    await page.goto("/accounts")
    await expect(page).toHaveURL(/\/login$/)
  })
})
