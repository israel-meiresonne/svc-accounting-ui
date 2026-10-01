import { fireEvent, render, screen } from "@testing-library/react"

import { useAccountPageFilters } from "@/lib/accounts/use-account-page-filters"
import { useAccountsQuery } from "@/lib/accounts/use-accounts"
import { useCategoriesQuery } from "@/lib/categories/use-categories"
import { formatMoney } from "@/lib/money"
import { useTransactionStats, useTransactions, type Transaction, type TransactionStats } from "@/lib/transactions/queries"
import AccountPage from "@/app/(app)/accounts/[accountCode]/page"

jest.mock("next/navigation", () => ({
  useParams: () => ({ accountCode: "acc_checking" }),
}))
jest.mock("@/lib/accounts/use-account-page-filters", () => ({
  useAccountPageFilters: jest.fn(),
}))
jest.mock("@/lib/accounts/use-accounts", () => ({
  useAccountsQuery: jest.fn(),
}))
jest.mock("@/lib/categories/use-categories", () => ({
  useCategoriesQuery: jest.fn(),
}))
jest.mock("@/lib/transactions/queries", () => ({
  ...jest.requireActual("@/lib/transactions/queries"),
  useTransactions: jest.fn(),
  useTransactionStats: jest.fn(),
}))
// The account page is not what these tests are about: stub the pieces that
// bring their own data hooks.
jest.mock("@/components/accounts/account-switcher", () => ({ __esModule: true, default: () => null }))
jest.mock("@/components/transactions/transaction-form-modal", () => ({ __esModule: true, default: () => null }))

const mockedUseAccountPageFilters = useAccountPageFilters as jest.Mock
const mockedUseAccountsQuery = useAccountsQuery as jest.Mock
const mockedUseCategoriesQuery = useCategoriesQuery as jest.Mock
const mockedUseTransactions = useTransactions as jest.Mock
const mockedUseTransactionStats = useTransactionStats as jest.Mock

const INTERVAL = { kind: "month", offset: 0 }

function transactionFixture(code: string, category: string): Transaction {
  return {
    code,
    occurredAt: "2026-08-05T10:00:00Z",
    amount: "-10.00",
    currency: "eur",
    category,
    paymentMethod: "credit_card",
    description: `${category} purchase`,
    counterparty: { code: "usr_1", displayName: "Someone" },
    account: { code: "acc_checking", name: "Everyday Checking", currency: "eur" },
  }
}

function statsFixture(income: string, expenses: string, net: string): TransactionStats {
  return {
    totalIncome: { amount: income, currency: "eur" },
    totalExpenses: { amount: expenses, currency: "eur" },
    netBalance: { amount: net, currency: "eur" },
  }
}

const TRANSFERS_ROW = transactionFixture("txn_transfer", "Transfers")
const GROCERIES_ROW = transactionFixture("txn_groceries", "Groceries")

let includedCategories: string[] = []
const mockUpdateIncludedCategories = jest.fn()

describe("AccountPage category filter", () => {
  beforeEach(() => {
    includedCategories = []
    mockUpdateIncludedCategories.mockReset()
    mockedUseAccountPageFilters.mockImplementation(() => ({
      interval: INTERVAL,
      updateInterval: jest.fn(),
      includedCategories,
      updateIncludedCategories: mockUpdateIncludedCategories,
      goToAccount: jest.fn(),
    }))
    mockedUseAccountsQuery.mockReturnValue({
      accounts: [{ code: "acc_checking", name: "Everyday Checking", currency: "eur" }],
    })
    mockedUseCategoriesQuery.mockReturnValue({ categories: ["Groceries", "Transfers"] })
    mockedUseTransactions.mockImplementation((filters: { includedCategories: string[] }) => ({
      transactions: filters.includedCategories.includes("Groceries") ? [GROCERIES_ROW] : [TRANSFERS_ROW, GROCERIES_ROW],
      isLoading: false,
    }))
    mockedUseTransactionStats.mockImplementation(
      (_accountCode: string, _from: string, _to: string, selected: string[]) => ({
        stats: selected.includes("Groceries") ? statsFixture("0", "10.00", "-10.00") : statsFixture("500.00", "300.00", "200.00"),
      })
    )
  })

  it("passes the selected categories to the transactions list", () => {
    includedCategories = ["Groceries"]

    render(<AccountPage />)

    expect(mockedUseTransactions).toHaveBeenCalledWith(
      expect.objectContaining({ accountCodes: ["acc_checking"], includedCategories: ["Groceries"] }),
      expect.anything(),
      expect.anything()
    )
  })

  it("passes the same selected categories to the stats as their fourth argument", () => {
    includedCategories = ["Groceries"]

    render(<AccountPage />)

    expect(mockedUseTransactionStats.mock.calls[0][3]).toEqual(["Groceries"])
  })

  it("renders the category filter from the categories query and the page's selection", () => {
    includedCategories = ["Groceries", "Transfers"]

    render(<AccountPage />)

    expect(screen.getByRole("button", { name: "2 selected" })).toBeInTheDocument()
  })

  it('shows "All categories" while nothing is selected', () => {
    render(<AccountPage />)

    expect(screen.getByRole("button", { name: "All categories" })).toBeInTheDocument()
  })

  it("asks the filters hook to add a category when it is checked", () => {
    render(<AccountPage />)

    fireEvent.keyDown(screen.getByRole("button", { name: "All categories" }), { key: "Enter" })
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Groceries" }))

    expect(mockUpdateIncludedCategories).toHaveBeenCalledWith(["Groceries"])
  })

  it("narrows the transaction table to the selected category", () => {
    const { rerender } = render(<AccountPage />)
    expect(screen.getByText("Transfers purchase")).toBeInTheDocument()

    includedCategories = ["Groceries"]
    rerender(<AccountPage />)

    expect(screen.queryByText("Transfers purchase")).not.toBeInTheDocument()
    expect(screen.getByText("Groceries purchase")).toBeInTheDocument()
  })

  it("recomputes the stat tiles, net balance included, when a category is selected", () => {
    const tileValue = (label: string) => screen.getByText(label).nextSibling?.textContent

    const { rerender } = render(<AccountPage />)
    expect(tileValue("Total income")).toBe(formatMoney("500.00", "eur"))
    expect(tileValue("Total expenses")).toBe(formatMoney("300.00", "eur"))
    expect(tileValue("Net balance")).toBe(formatMoney("200.00", "eur"))

    includedCategories = ["Groceries"]
    rerender(<AccountPage />)

    expect(tileValue("Total income")).toBe(formatMoney("0", "eur"))
    expect(tileValue("Total expenses")).toBe(formatMoney("10.00", "eur"))
    expect(tileValue("Net balance")).toBe(formatMoney("-10.00", "eur"))
  })
})
