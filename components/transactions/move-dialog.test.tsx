import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { useAccountsQuery } from "@/lib/accounts/use-accounts"
import type { Transaction } from "@/lib/transactions/queries"
import MoveDialog from "@/components/transactions/move-dialog"

jest.mock("@/lib/accounts/use-accounts", () => ({
  useAccountsQuery: jest.fn(),
}))
jest.mock("@/lib/transactions/queries", () => ({
  useMoveTransactions: () => ({ mutateAsync: jest.fn(), isPending: false }),
}))

const mockedUseAccountsQuery = useAccountsQuery as jest.Mock

function makeTransaction(code: string, currency: string): Transaction {
  return {
    code,
    occurredAt: "2026-01-01",
    amount: "10.00",
    currency,
    category: "Groceries",
    paymentMethod: "credit_card",
    description: "",
    counterparty: { code: "usr_1", displayName: "Someone" },
    account: { code: "acc_1", name: "Checking", currency },
  }
}

describe("<MoveDialog />", () => {
  beforeEach(() => {
    mockedUseAccountsQuery.mockReturnValue({
      accounts: [
        { code: "acc_eur", name: "Savings", currency: "eur" },
        { code: "acc_usd", name: "Travel Card", currency: "usd" },
      ],
    })
  })

  it("only lists accounts sharing the selection's currency", async () => {
    const user = userEvent.setup()

    render(
      <MoveDialog
        selectedCodes={["txn_1"]}
        selectedTransactions={[makeTransaction("txn_1", "eur")]}
        open
        onOpenChange={jest.fn()}
      />
    )

    await user.click(screen.getByRole("combobox"))

    expect(await screen.findByRole("option", { name: /savings/i })).toBeInTheDocument()
    expect(screen.queryByRole("option", { name: /travel card/i })).not.toBeInTheDocument()
  })

  it("disables the action when the selection spans more than one currency", () => {
    render(
      <MoveDialog
        selectedCodes={["txn_1", "txn_2"]}
        selectedTransactions={[makeTransaction("txn_1", "eur"), makeTransaction("txn_2", "usd")]}
        open
        onOpenChange={jest.fn()}
      />
    )

    expect(screen.getByRole("combobox")).toBeDisabled()
    expect(screen.getByRole("button", { name: /move 2 transactions/i })).toBeDisabled()
    expect(screen.getByText(/span more than one currency/i)).toBeInTheDocument()
  })
})
