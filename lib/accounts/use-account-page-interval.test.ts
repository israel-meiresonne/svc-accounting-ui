import { renderHook } from "@testing-library/react"

import { useAccountPageInterval } from "@/lib/accounts/use-account-page-interval"

const mockPush = jest.fn()
const mockReplace = jest.fn()
let currentSearchParams = new URLSearchParams()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => "/accounts/acc_checking",
  useSearchParams: () => currentSearchParams,
}))

describe("useAccountPageInterval", () => {
  beforeEach(() => {
    mockPush.mockClear()
    mockReplace.mockClear()
    currentSearchParams = new URLSearchParams("interval=week&offset=-2")
  })

  it("reads the interval out of the URL", () => {
    const { result } = renderHook(() => useAccountPageInterval())

    expect(result.current.interval).toEqual({ kind: "week", offset: -2 })
  })

  it("falls back to the current month when the URL carries no interval", () => {
    currentSearchParams = new URLSearchParams()

    const { result } = renderHook(() => useAccountPageInterval())

    expect(result.current.interval).toEqual({ kind: "month", offset: 0 })
  })

  it("replaces the current URL with the newly picked interval", () => {
    const { result } = renderHook(() => useAccountPageInterval())

    result.current.updateInterval({ kind: "month", offset: -1 })

    expect(mockReplace).toHaveBeenCalledWith("/accounts/acc_checking?interval=month&offset=-1")
    expect(mockPush).not.toHaveBeenCalled()
  })

  it("carries the current query params over when switching account", () => {
    const { result } = renderHook(() => useAccountPageInterval())

    result.current.goToAccount("acc_savings")

    expect(mockPush).toHaveBeenCalledWith("/accounts/acc_savings?interval=week&offset=-2")
  })

  it("switches account without a query string when the URL carries no params", () => {
    currentSearchParams = new URLSearchParams()

    const { result } = renderHook(() => useAccountPageInterval())

    result.current.goToAccount("acc_savings")

    expect(mockPush).toHaveBeenCalledWith("/accounts/acc_savings")
  })
})
