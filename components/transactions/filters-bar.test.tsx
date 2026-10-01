import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { useAccountsQuery } from "@/lib/accounts/use-accounts"
import { useCategoriesQuery } from "@/lib/categories/use-categories"
import FiltersBar, { type TransactionsFilterValues } from "@/components/transactions/filters-bar"

jest.mock("@/lib/accounts/use-accounts", () => ({
  useAccountsQuery: jest.fn(),
}))
jest.mock("@/lib/categories/use-categories", () => ({
  useCategoriesQuery: jest.fn(),
}))

const mockedUseAccountsQuery = useAccountsQuery as jest.Mock
const mockedUseCategoriesQuery = useCategoriesQuery as jest.Mock

const INTERVAL = { kind: "month", offset: 0 } as const

function renderBar(overrides: Partial<TransactionsFilterValues> = {}) {
  const filters: TransactionsFilterValues = {
    accountCodes: ["acc_1"],
    includedCategories: [],
    paymentMethod: "cash",
    ...overrides,
  }
  const onFiltersChange = jest.fn()
  const user = userEvent.setup()

  render(<FiltersBar interval={INTERVAL} filters={filters} onIntervalChange={jest.fn()} onFiltersChange={onFiltersChange} />)

  return { filters, onFiltersChange, user }
}

describe("<FiltersBar /> category filter", () => {
  beforeEach(() => {
    mockedUseAccountsQuery.mockReturnValue({
      accounts: [{ code: "acc_1", name: "Everyday Checking", currency: "eur" }],
    })
    mockedUseCategoriesQuery.mockReturnValue({ categories: ["Groceries", "Rent", "Transfers"] })
  })

  it('shows "All categories" while nothing is selected', () => {
    renderBar({ includedCategories: [] })

    expect(screen.getByRole("button", { name: "All categories" })).toBeInTheDocument()
  })

  it("shows how many categories are selected", () => {
    renderBar({ includedCategories: ["Rent", "Transfers"] })

    expect(screen.getByRole("button", { name: "2 selected" })).toBeInTheDocument()
  })

  it("adds a checked category to the filters, leaving the other fields alone", async () => {
    const { filters, onFiltersChange, user } = renderBar({ includedCategories: ["Rent"] })

    await user.click(screen.getByRole("button", { name: "1 selected" }))
    await user.click(screen.getByRole("menuitemcheckbox", { name: "Groceries" }))

    expect(onFiltersChange).toHaveBeenCalledWith({ ...filters, includedCategories: ["Rent", "Groceries"] })
  })

  it("removes an unchecked category from the filters", async () => {
    const { filters, onFiltersChange, user } = renderBar({ includedCategories: ["Rent", "Groceries"] })

    await user.click(screen.getByRole("button", { name: "2 selected" }))
    await user.click(screen.getByRole("menuitemcheckbox", { name: "Rent" }))

    expect(onFiltersChange).toHaveBeenCalledWith({ ...filters, includedCategories: ["Groceries"] })
  })

  it("keeps the account codes and payment method when a category is toggled", async () => {
    const { onFiltersChange, user } = renderBar({ accountCodes: ["acc_1"], paymentMethod: "cash" })

    await user.click(screen.getByRole("button", { name: "All categories" }))
    await user.click(screen.getByRole("menuitemcheckbox", { name: "Transfers" }))

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ accountCodes: ["acc_1"], paymentMethod: "cash" })
    )
  })

  it("no longer renders the free-text category input", () => {
    renderBar()

    expect(screen.queryByLabelText("Filter by category")).not.toBeInTheDocument()
  })
})
