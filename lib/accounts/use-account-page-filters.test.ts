import { renderHook } from "@testing-library/react"

import { useAccountPageFilters } from "@/lib/accounts/use-account-page-filters"

const mockPush = jest.fn()
const mockReplace = jest.fn()
let currentSearchParams = new URLSearchParams()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => "/accounts/acc_checking",
  useSearchParams: () => currentSearchParams,
}))

describe("useAccountPageFilters", () => {
  beforeEach(() => {
    mockPush.mockClear()
    mockReplace.mockClear()
    currentSearchParams = new URLSearchParams("interval=week&offset=-2")
  })

  it("reads the interval out of the URL", () => {
    const { result } = renderHook(() => useAccountPageFilters())

    expect(result.current.interval).toEqual({ kind: "week", offset: -2 })
  })

  it("falls back to the current month when the URL carries no interval", () => {
    currentSearchParams = new URLSearchParams()

    const { result } = renderHook(() => useAccountPageFilters())

    expect(result.current.interval).toEqual({ kind: "month", offset: 0 })
  })

  it("replaces the current URL with the newly picked interval", () => {
    const { result } = renderHook(() => useAccountPageFilters())

    result.current.updateInterval({ kind: "month", offset: -1 })

    expect(mockReplace).toHaveBeenCalledWith("/accounts/acc_checking?interval=month&offset=-1")
    expect(mockPush).not.toHaveBeenCalled()
  })

  it("reads the included categories out of the URL", () => {
    currentSearchParams = new URLSearchParams("interval=week&offset=-2&included_categories=Rent,Fees")

    const { result } = renderHook(() => useAccountPageFilters())

    expect(result.current.includedCategories).toEqual(["Rent", "Fees"])
  })

  it("has no included categories when the URL carries none", () => {
    const { result } = renderHook(() => useAccountPageFilters())

    expect(result.current.includedCategories).toEqual([])
  })

  it("keeps the included categories when the interval changes", () => {
    currentSearchParams = new URLSearchParams("interval=week&offset=-2&included_categories=Rent,Fees")
    const { result } = renderHook(() => useAccountPageFilters())

    result.current.updateInterval({ kind: "month", offset: -1 })

    expect(mockReplace).toHaveBeenCalledWith("/accounts/acc_checking?interval=month&offset=-1&included_categories=Rent%2CFees")
  })

  it("replaces the URL with the newly picked categories while keeping the interval", () => {
    const { result } = renderHook(() => useAccountPageFilters())

    result.current.updateIncludedCategories(["Rent", "Fees"])

    expect(mockReplace).toHaveBeenCalledWith("/accounts/acc_checking?interval=week&offset=-2&included_categories=Rent%2CFees")
    expect(mockPush).not.toHaveBeenCalled()
  })

  it("drops the categories param from the URL when the selection is cleared", () => {
    currentSearchParams = new URLSearchParams("interval=week&offset=-2&included_categories=Rent")
    const { result } = renderHook(() => useAccountPageFilters())

    result.current.updateIncludedCategories([])

    expect(mockReplace).toHaveBeenCalledWith("/accounts/acc_checking?interval=week&offset=-2")
  })

  it("carries the current query params over when switching account", () => {
    const { result } = renderHook(() => useAccountPageFilters())

    result.current.goToAccount("acc_savings")

    expect(mockPush).toHaveBeenCalledWith("/accounts/acc_savings?interval=week&offset=-2")
  })

  it("switches account without a query string when the URL carries no params", () => {
    currentSearchParams = new URLSearchParams()

    const { result } = renderHook(() => useAccountPageFilters())

    result.current.goToAccount("acc_savings")

    expect(mockPush).toHaveBeenCalledWith("/accounts/acc_savings")
  })
})
