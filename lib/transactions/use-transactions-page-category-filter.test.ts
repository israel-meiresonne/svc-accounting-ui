import { renderHook } from "@testing-library/react"

import { useTransactionsPageCategoryFilter } from "@/lib/transactions/use-transactions-page-category-filter"

const mockPush = jest.fn()
const mockReplace = jest.fn()
let currentSearchParams = new URLSearchParams()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => "/transactions",
  useSearchParams: () => currentSearchParams,
}))

describe("useTransactionsPageCategoryFilter", () => {
  beforeEach(() => {
    mockPush.mockClear()
    mockReplace.mockClear()
    currentSearchParams = new URLSearchParams()
  })

  it("reads the included categories out of the URL", () => {
    currentSearchParams = new URLSearchParams("included_categories=Rent,Fees")

    const { result } = renderHook(() => useTransactionsPageCategoryFilter())

    expect(result.current.includedCategories).toEqual(["Rent", "Fees"])
  })

  it("has no included categories when the URL carries none", () => {
    const { result } = renderHook(() => useTransactionsPageCategoryFilter())

    expect(result.current.includedCategories).toEqual([])
  })

  it("replaces the URL with the comma-joined categories", () => {
    const { result } = renderHook(() => useTransactionsPageCategoryFilter())

    result.current.updateIncludedCategories(["Rent", "Fees"])

    expect(mockReplace).toHaveBeenCalledWith("/transactions?included_categories=Rent%2CFees")
    expect(mockPush).not.toHaveBeenCalled()
  })

  it("removes the param from the URL entirely for an empty selection", () => {
    currentSearchParams = new URLSearchParams("included_categories=Rent")
    const { result } = renderHook(() => useTransactionsPageCategoryFilter())

    result.current.updateIncludedCategories([])

    expect(mockReplace).toHaveBeenCalledWith("/transactions?")
  })
})
