import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { useAccountsQuery } from "@/lib/accounts/use-accounts"
import AccountSwitcher from "@/components/accounts/account-switcher"

const mockPush = jest.fn()
let currentSearchParams = new URLSearchParams()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
  usePathname: () => "/accounts/acc_checking",
  useSearchParams: () => currentSearchParams,
}))
jest.mock("@/lib/accounts/use-accounts", () => ({
  useAccountsQuery: jest.fn(),
}))

const mockedUseAccountsQuery = useAccountsQuery as jest.Mock

describe("<AccountSwitcher />", () => {
  beforeEach(() => {
    mockPush.mockClear()
    currentSearchParams = new URLSearchParams("interval=week&offset=-2")
    mockedUseAccountsQuery.mockReturnValue({
      accounts: [
        { code: "acc_checking", name: "Everyday Checking", currency: "eur" },
        { code: "acc_savings", name: "Savings", currency: "usd" },
      ],
    })
  })

  it("carries the current interval's query params over to the account it switches to", async () => {
    const user = userEvent.setup()

    render(<AccountSwitcher currentAccountCode="acc_checking" />)

    await user.click(screen.getByRole("combobox", { name: /account/i }))
    await user.click(await screen.findByRole("option", { name: /savings/i }))

    expect(mockPush).toHaveBeenCalledWith("/accounts/acc_savings?interval=week&offset=-2")
  })

  it("navigates without a query string when the URL carries no params", async () => {
    currentSearchParams = new URLSearchParams()
    const user = userEvent.setup()

    render(<AccountSwitcher currentAccountCode="acc_checking" />)

    await user.click(screen.getByRole("combobox", { name: /account/i }))
    await user.click(await screen.findByRole("option", { name: /savings/i }))

    expect(mockPush).toHaveBeenCalledWith("/accounts/acc_savings")
  })

  it("does not navigate when the already-selected account is picked again", async () => {
    const user = userEvent.setup()

    render(<AccountSwitcher currentAccountCode="acc_checking" />)

    await user.click(screen.getByRole("combobox", { name: /account/i }))
    await user.click(await screen.findByRole("option", { name: /everyday checking/i }))

    expect(mockPush).not.toHaveBeenCalled()
  })
})
