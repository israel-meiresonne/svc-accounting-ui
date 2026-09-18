import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import type { Account } from "@/lib/accounts/use-accounts"
import { useCreateAccount, useUpdateAccount } from "@/lib/accounts/use-accounts"
import AccountFormDialog from "@/components/accounts/account-form-dialog"

jest.mock("@/lib/accounts/use-accounts", () => ({
  useCreateAccount: jest.fn(),
  useUpdateAccount: jest.fn(),
}))

const mockedUseCreateAccount = useCreateAccount as jest.Mock
const mockedUseUpdateAccount = useUpdateAccount as jest.Mock

function accountFixture(overrides: Partial<Account> = {}): Account {
  return {
    code: "acc_01",
    name: "Everyday Checking",
    currency: "eur",
    balance: { amount: "100.00", currency: "eur" },
    hasTransactions: false,
    ...overrides,
  }
}

describe("<AccountFormDialog />", () => {
  beforeEach(() => {
    mockedUseCreateAccount.mockReset()
    mockedUseUpdateAccount.mockReset()
    mockedUseUpdateAccount.mockReturnValue({ mutateAsync: jest.fn(), isPending: false })
  })

  it("submits initial_balance (and a null current_balance) when the opening-balance mode is picked", async () => {
    const mutateAsync = jest.fn().mockResolvedValue(undefined)
    mockedUseCreateAccount.mockReturnValue({ mutateAsync, isPending: false })
    const user = userEvent.setup()

    render(<AccountFormDialog open onOpenChange={jest.fn()} />)

    await user.type(screen.getByLabelText(/account name/i), "Everyday Checking")
    await user.type(screen.getByLabelText(/opening balance \(as of account creation\)/i), "100.00")
    await user.click(screen.getByRole("button", { name: /create_account/i }))

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        name: "Everyday Checking",
        currency: "usd",
        initial_balance: "100.00",
        current_balance: null,
      })
    })
  })

  it("submits current_balance (and a null initial_balance) when the current-balance mode is picked", async () => {
    const mutateAsync = jest.fn().mockResolvedValue(undefined)
    mockedUseCreateAccount.mockReturnValue({ mutateAsync, isPending: false })
    const user = userEvent.setup()

    render(<AccountFormDialog open onOpenChange={jest.fn()} />)

    await user.type(screen.getByLabelText(/account name/i), "US Freelance")
    await user.click(screen.getByRole("radio", { name: /i know today's balance/i }))
    await user.type(screen.getByLabelText(/current balance \(today\)/i), "1842.30")
    await user.click(screen.getByRole("button", { name: /create_account/i }))

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        name: "US Freelance",
        currency: "usd",
        initial_balance: null,
        current_balance: "1842.30",
      })
    })
  })

  it("disables the currency field in edit mode once the account has transactions", () => {
    mockedUseCreateAccount.mockReturnValue({ mutateAsync: jest.fn(), isPending: false })

    render(
      <AccountFormDialog
        account={accountFixture({ hasTransactions: true })}
        open
        onOpenChange={jest.fn()}
      />
    )

    expect(screen.getByRole("combobox")).toBeDisabled()
    expect(
      screen.getByText(/locked — this account already has transactions/i)
    ).toBeInTheDocument()
  })

  it("leaves the currency field enabled in edit mode when the account has no transactions", () => {
    mockedUseCreateAccount.mockReturnValue({ mutateAsync: jest.fn(), isPending: false })

    render(
      <AccountFormDialog
        account={accountFixture({ hasTransactions: false })}
        open
        onOpenChange={jest.fn()}
      />
    )

    expect(screen.getByRole("combobox")).not.toBeDisabled()
    expect(
      screen.queryByText(/locked — this account already has transactions/i)
    ).not.toBeInTheDocument()
  })
})
