import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { ApiError } from "@/lib/api-client"
import { useAccountsQuery } from "@/lib/accounts/use-accounts"
import {
  useCounterpartySearch,
  useCreateTransaction,
  useUpdateTransaction,
  type Transaction,
} from "@/lib/transactions/queries"
import TransactionFormModal from "@/components/transactions/transaction-form-modal"

jest.mock("@/lib/accounts/use-accounts", () => ({
  useAccountsQuery: jest.fn(),
}))
jest.mock("@/lib/transactions/queries", () => ({
  useCreateTransaction: jest.fn(),
  useUpdateTransaction: jest.fn(),
  useBulkDeleteTransactions: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useCounterpartySearch: jest.fn(),
}))

const mockedUseAccountsQuery = useAccountsQuery as jest.Mock
const mockedUseCreateTransaction = useCreateTransaction as jest.Mock
const mockedUseUpdateTransaction = useUpdateTransaction as jest.Mock
const mockedUseCounterpartySearch = useCounterpartySearch as jest.Mock

const TRANSACTION: Transaction = {
  code: "txn_01",
  occurredAt: "2026-03-04T09:15:00Z",
  amount: "-45.20",
  currency: "eur",
  category: "Groceries",
  paymentMethod: "credit_card",
  description: "Weekly shop",
  counterparty: { code: "usr_shop", displayName: "Corner Shop" },
  account: { code: "acc_checking", name: "Everyday Checking", currency: "eur" },
}

function createMutation() {
  const mutateAsync = jest.fn().mockResolvedValue(undefined)
  return { mutateAsync, isPending: false }
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  fireEvent.change(screen.getByLabelText(/date and time/i), {
    target: { value: "2026-03-04T09:15" },
  })
  await user.type(screen.getByLabelText(/^amount$/i), "-45.20")
  await user.type(screen.getByLabelText(/^category$/i), "Groceries")
}

describe("<TransactionFormModal />", () => {
  let createMutationStub = createMutation()
  let updateMutationStub = createMutation()

  beforeEach(() => {
    createMutationStub = createMutation()
    updateMutationStub = createMutation()
    mockedUseCreateTransaction.mockReturnValue(createMutationStub)
    mockedUseUpdateTransaction.mockReturnValue(updateMutationStub)
    mockedUseAccountsQuery.mockReturnValue({
      accounts: [{ code: "acc_checking", name: "Everyday Checking", currency: "eur" }],
    })
    mockedUseCounterpartySearch.mockReturnValue({
      counterparties: [{ code: "usr_shop", displayName: "Corner Shop" }],
      isLoading: false,
      isError: false,
    })
  })

  it("creates a transaction with an existing counterparty, and never submits a currency", async () => {
    const user = userEvent.setup()

    render(<TransactionFormModal open accountCode="acc_checking" onOpenChange={jest.fn()} />)

    await fillRequiredFields(user)
    await user.type(screen.getByLabelText(/search counterparties/i), "Corner")
    await user.click(screen.getByRole("button", { name: "Corner Shop" }))
    await user.click(screen.getByRole("button", { name: /create_transaction/i }))

    await waitFor(() => expect(createMutationStub.mutateAsync).toHaveBeenCalled())

    const payload = createMutationStub.mutateAsync.mock.calls[0][0]
    expect(payload).toEqual({
      account_code: "acc_checking",
      amount: "-45.20",
      category: "Groceries",
      description: "",
      payment_method: "cash",
      occurred_at: "2026-03-04T09:15",
      counterparty_code: "usr_shop",
    })
    expect(payload).not.toHaveProperty("currency")
  })

  it("creates a transaction with a brand-new counterparty described inline", async () => {
    const user = userEvent.setup()

    render(<TransactionFormModal open accountCode="acc_checking" onOpenChange={jest.fn()} />)

    await fillRequiredFields(user)
    await user.type(screen.getByLabelText(/search counterparties/i), "Ada")
    await user.click(screen.getByRole("button", { name: /create new: ada/i }))
    await user.type(screen.getByLabelText(/last name/i), "Lovelace")
    await user.click(screen.getByRole("button", { name: /create_transaction/i }))

    await waitFor(() => expect(createMutationStub.mutateAsync).toHaveBeenCalled())

    const payload = createMutationStub.mutateAsync.mock.calls[0][0]
    expect(payload.counterparty_options).toEqual({
      type: "contact",
      first_name: "Ada",
      last_name: "Lovelace",
      company_name: null,
    })
    expect(payload).not.toHaveProperty("counterparty_code")
    expect(payload).not.toHaveProperty("currency")
  })

  it("pre-fills every field in edit mode and updates through the transaction's own code", async () => {
    const user = userEvent.setup()

    render(
      <TransactionFormModal
        open
        accountCode="acc_checking"
        transaction={TRANSACTION}
        onOpenChange={jest.fn()}
      />
    )

    expect(screen.getByLabelText(/^amount$/i)).toHaveValue("-45.20")
    expect(screen.getByLabelText(/^category$/i)).toHaveValue("Groceries")
    expect(screen.getByLabelText(/^description$/i)).toHaveValue("Weekly shop")
    expect(screen.getByRole("combobox", { name: /payment method/i })).toHaveTextContent("Credit card")
    expect(screen.getByTestId("selected-counterparty")).toHaveTextContent("usr_shop")

    await user.click(screen.getByRole("button", { name: /save_changes/i }))

    await waitFor(() => expect(updateMutationStub.mutateAsync).toHaveBeenCalled())

    const { code, payload } = updateMutationStub.mutateAsync.mock.calls[0][0]
    expect(code).toBe("txn_01")
    // The backend resolves the transaction through its account, so
    // `account_code` rides along in the body even on an update.
    expect(payload.account_code).toBe("acc_checking")
    expect(payload.counterparty_code).toBe("usr_shop")
    expect(payload).not.toHaveProperty("currency")
  })

  it("shows the account's currency as a disabled field in both modes", () => {
    const { unmount } = render(
      <TransactionFormModal open accountCode="acc_checking" onOpenChange={jest.fn()} />
    )

    expect(screen.getByLabelText(/^currency$/i)).toBeDisabled()
    expect(screen.getByLabelText(/^currency$/i)).toHaveValue("EUR")

    unmount()

    render(
      <TransactionFormModal
        open
        accountCode="acc_checking"
        transaction={TRANSACTION}
        onOpenChange={jest.fn()}
      />
    )

    expect(screen.getByLabelText(/^currency$/i)).toBeDisabled()
  })

  it("blocks submission when no counterparty has been chosen", async () => {
    const user = userEvent.setup()

    render(<TransactionFormModal open accountCode="acc_checking" onOpenChange={jest.fn()} />)

    await fillRequiredFields(user)
    await user.click(screen.getByRole("button", { name: /create_transaction/i }))

    expect(await screen.findByText(/pick a counterparty/i)).toBeInTheDocument()
    expect(createMutationStub.mutateAsync).not.toHaveBeenCalled()
  })

  it("shows a missing_counterparty backend error on the counterparty field, not a toast", async () => {
    const user = userEvent.setup()

    createMutationStub.mutateAsync.mockRejectedValueOnce(
      new ApiError({ code: "missing_counterparty", message: "Provide either an existing counterparty or new counterparty details", details: {} })
    )

    render(<TransactionFormModal open accountCode="acc_checking" onOpenChange={jest.fn()} />)

    await fillRequiredFields(user)
    await user.type(screen.getByLabelText(/search counterparties/i), "Corner")
    await user.click(screen.getByRole("button", { name: "Corner Shop" }))
    await user.click(screen.getByRole("button", { name: /create_transaction/i }))

    expect(
      await screen.findByText(/provide either an existing counterparty or new counterparty details/i)
    ).toBeInTheDocument()
  })
})
