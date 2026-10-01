import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { useAccountsQuery } from "@/lib/accounts/use-accounts"
import { useCategoriesQuery } from "@/lib/categories/use-categories"
import StatisticsFilterPanel from "@/components/statistics/statistics-filter-panel"

const mockPush = jest.fn()
let mockSearchParams = new URLSearchParams()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/statistics",
  useSearchParams: () => mockSearchParams,
}))

jest.mock("@/lib/accounts/use-accounts", () => ({
  useAccountsQuery: jest.fn(),
}))
jest.mock("@/lib/categories/use-categories", () => ({
  useCategoriesQuery: jest.fn(),
}))

const mockedUseAccountsQuery = useAccountsQuery as jest.Mock
const mockedUseCategoriesQuery = useCategoriesQuery as jest.Mock

describe("<StatisticsFilterPanel />", () => {
  beforeEach(() => {
    mockPush.mockClear()
    mockSearchParams = new URLSearchParams()
    mockedUseAccountsQuery.mockReturnValue({
      accounts: [
        { code: "acc_1", name: "Everyday Checking", currency: "eur" },
        { code: "acc_2", name: "US Freelance", currency: "usd" },
      ],
    })
    mockedUseCategoriesQuery.mockReturnValue({ categories: ["Groceries", "Transfers"] })
  })

  it("no longer renders the free-text category input", () => {
    render(<StatisticsFilterPanel />)

    expect(screen.queryByLabelText(/filter by category/i)).not.toBeInTheDocument()
  })

  it("updates the URL's included_categories param when a category is checked", async () => {
    const user = userEvent.setup()
    render(<StatisticsFilterPanel />)

    await user.click(screen.getByRole("button", { name: "All categories" }))
    await user.click(screen.getByRole("menuitemcheckbox", { name: "Transfers" }))

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("included_categories=Transfers"))
  })

  it("keeps the category dropdown open after a category is checked", async () => {
    const user = userEvent.setup()
    render(<StatisticsFilterPanel />)

    await user.click(screen.getByRole("button", { name: "All categories" }))
    await user.click(screen.getByRole("menuitemcheckbox", { name: "Transfers" }))

    expect(screen.getByRole("menuitemcheckbox", { name: "Groceries" })).toBeInTheDocument()
  })

  it("reflects a category already selected in the URL", async () => {
    mockSearchParams = new URLSearchParams("included_categories=Transfers")
    const user = userEvent.setup()
    render(<StatisticsFilterPanel />)

    await user.click(screen.getByRole("button", { name: "1 selected" }))

    expect(screen.getByRole("menuitemcheckbox", { name: "Transfers" })).toBeChecked()
    expect(screen.getByRole("menuitemcheckbox", { name: "Groceries" })).not.toBeChecked()
  })

  it("updates the URL when a payment method is selected", async () => {
    const user = userEvent.setup()
    render(<StatisticsFilterPanel />)

    await user.click(screen.getByRole("combobox", { name: /filter by payment method/i }))
    await user.click(await screen.findByRole("option", { name: "Cash" }))

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("payment_method=cash"))
  })

  it("updates the URL when an account is toggled on", async () => {
    const user = userEvent.setup()
    render(<StatisticsFilterPanel />)

    await user.click(screen.getByText(/Everyday Checking/))

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("accounts=acc_1"))
  })

  it("updates the URL when the interval kind is switched to custom", async () => {
    const user = userEvent.setup()
    render(<StatisticsFilterPanel />)

    await user.click(screen.getByRole("combobox", { name: /interval kind/i }))
    await user.click(await screen.findByRole("option", { name: "Custom interval" }))

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("interval=custom"))
  })

  it("shifts the interval's offset forward when the next-interval arrow is clicked", async () => {
    mockSearchParams = new URLSearchParams("interval=month")
    const user = userEvent.setup()
    render(<StatisticsFilterPanel />)

    await user.click(screen.getByRole("button", { name: /next interval/i }))

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("offset=1"))
  })

  it("disables the interval navigation arrows when the URL already selects a custom interval", () => {
    mockSearchParams = new URLSearchParams("interval=custom&from=2026-08-01&to=2026-08-10")
    render(<StatisticsFilterPanel />)

    expect(screen.getByRole("button", { name: /previous interval/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: /next interval/i })).toBeDisabled()
  })
})
