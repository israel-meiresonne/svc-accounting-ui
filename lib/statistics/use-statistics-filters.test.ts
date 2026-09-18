import { renderHook } from "@testing-library/react"

import {
  parseStatisticsFilters,
  statisticsFiltersToSearchParams,
  useStatisticsFilters,
} from "@/lib/statistics/use-statistics-filters"

describe("parseStatisticsFilters", () => {
  it("defaults to no filters and the current month when the URL is empty", () => {
    const filters = parseStatisticsFilters(new URLSearchParams())

    expect(filters.accountCodes).toEqual([])
    expect(filters.category).toBeNull()
    expect(filters.paymentMethod).toBeNull()
    expect(filters.interval).toEqual({ kind: "month", offset: 0 })
  })

  it("parses accounts, category, and payment method from the URL", () => {
    const filters = parseStatisticsFilters(
      new URLSearchParams("accounts=acc_1,acc_2&category=rent&payment_method=cash")
    )

    expect(filters.accountCodes).toEqual(["acc_1", "acc_2"])
    expect(filters.category).toBe("rent")
    expect(filters.paymentMethod).toBe("cash")
  })

  it("ignores an unrecognized payment method value", () => {
    const filters = parseStatisticsFilters(new URLSearchParams("payment_method=bitcoin"))

    expect(filters.paymentMethod).toBeNull()
  })

  it("parses a periodic interval's kind and offset", () => {
    const filters = parseStatisticsFilters(new URLSearchParams("interval=week&offset=-2"))

    expect(filters.interval).toEqual({ kind: "week", offset: -2 })
  })

  it("falls back to the current month for an unrecognized interval kind", () => {
    const filters = parseStatisticsFilters(new URLSearchParams("interval=fortnight"))

    expect(filters.interval).toEqual({ kind: "month", offset: 0 })
  })

  it("parses a custom interval's explicit from/to", () => {
    const filters = parseStatisticsFilters(new URLSearchParams("interval=custom&from=2026-01-01&to=2026-01-31"))

    expect(filters.interval.kind).toBe("custom")
    if (filters.interval.kind === "custom") {
      expect(filters.interval.from.getFullYear()).toBe(2026)
      expect(filters.interval.from.getMonth()).toBe(0)
      expect(filters.interval.from.getDate()).toBe(1)
      expect(filters.interval.to.getDate()).toBe(31)
    }
  })

  it("falls back to the current month when custom is selected but from/to are missing", () => {
    const filters = parseStatisticsFilters(new URLSearchParams("interval=custom"))

    expect(filters.interval).toEqual({ kind: "month", offset: 0 })
  })
})

describe("statisticsFiltersToSearchParams", () => {
  it("omits accounts/category/payment_method/offset when unset", () => {
    const params = statisticsFiltersToSearchParams({
      accountCodes: [],
      category: null,
      paymentMethod: null,
      interval: { kind: "month", offset: 0 },
    })

    expect(params.get("accounts")).toBeNull()
    expect(params.get("category")).toBeNull()
    expect(params.get("payment_method")).toBeNull()
    expect(params.get("offset")).toBeNull()
    expect(params.get("interval")).toBe("month")
  })

  it("serializes accounts, category, payment method, and a nonzero offset", () => {
    const params = statisticsFiltersToSearchParams({
      accountCodes: ["acc_1", "acc_2"],
      category: "rent",
      paymentMethod: "cash",
      interval: { kind: "week", offset: -2 },
    })

    expect(params.get("accounts")).toBe("acc_1,acc_2")
    expect(params.get("category")).toBe("rent")
    expect(params.get("payment_method")).toBe("cash")
    expect(params.get("interval")).toBe("week")
    expect(params.get("offset")).toBe("-2")
  })

  it("serializes a custom interval's from/to instead of an offset", () => {
    const params = statisticsFiltersToSearchParams({
      accountCodes: [],
      category: null,
      paymentMethod: null,
      interval: { kind: "custom", from: new Date(2026, 0, 1), to: new Date(2026, 0, 31) },
    })

    expect(params.get("interval")).toBe("custom")
    expect(params.get("from")).toBe("2026-01-01")
    expect(params.get("to")).toBe("2026-01-31")
    expect(params.get("offset")).toBeNull()
  })
})

const mockPush = jest.fn()
let currentSearchParams = new URLSearchParams()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/statistics",
  useSearchParams: () => currentSearchParams,
}))

describe("useStatisticsFilters", () => {
  beforeEach(() => {
    mockPush.mockClear()
    currentSearchParams = new URLSearchParams("interval=month&category=rent")
  })

  it("merges a partial update into the current filters and pushes the resulting URL", () => {
    const { result } = renderHook(() => useStatisticsFilters())

    result.current.updateFilters({ paymentMethod: "cash" })

    expect(mockPush).toHaveBeenCalledTimes(1)
    const pushedUrl = mockPush.mock.calls[0][0] as string
    expect(pushedUrl.startsWith("/statistics?")).toBe(true)
    expect(pushedUrl).toContain("category=rent")
    expect(pushedUrl).toContain("payment_method=cash")
  })
})
