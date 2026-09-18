import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { useAccountsQuery } from "@/lib/accounts/use-accounts"
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

const mockedUseAccountsQuery = useAccountsQuery as jest.Mock

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
  })

  it("updates the URL once the category filter is committed", async () => {
    const user = userEvent.setup()
    render(<StatisticsFilterPanel />)

    await user.type(screen.getByLabelText(/filter by category/i), "rent")
    await user.tab()

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("category=rent"))
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
