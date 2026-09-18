import type { ReactNode } from "react"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { apiClient } from "@/lib/api-client"
import { useStatistics } from "@/lib/statistics/use-statistics"
import type { StatisticsFilters } from "@/lib/statistics/use-statistics-filters"

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn() },
}))

const mockedGet = apiClient.get as jest.Mock

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

const FILTERS: StatisticsFilters = {
  accountCodes: ["acc_1"],
  category: "rent",
  paymentMethod: "cash",
  interval: { kind: "month", offset: 0 },
}

const RESPONSE_DATA = {
  currency: "eur",
  current: {
    from: "2026-08-01",
    to: "2026-08-31",
    daily_totals: [
      {
        date: "2026-08-01",
        cumulative_income: "100.00",
        cumulative_expenses: "40.00",
        cumulative_net_balance: "60.00",
      },
    ],
    total_income: "100.00",
    total_expenses: "40.00",
    net_balance: "60.00",
    forecast_net_balance: "120.00",
    income_by_category: [{ category: "salary", amount: "100.00" }],
    expenses_by_category: [{ category: "rent", amount: "40.00" }],
  },
  previous: {
    from: "2026-07-01",
    to: "2026-07-31",
    daily_totals: [],
    total_income: "80.00",
    total_expenses: "30.00",
    net_balance: "50.00",
    income_by_category: [],
    expenses_by_category: [],
  },
}

describe("useStatistics", () => {
  beforeEach(() => {
    mockedGet.mockReset()
    // `useStatistics` resolves its date range against `new Date()`
    // directly (matching `IntervalNav`/`TransactionsPage`'s own
    // convention, never a persisted reference date), so a fixed system
    // time keeps this suite deterministic regardless of when it runs.
    jest.useFakeTimers().setSystemTime(new Date(2026, 7, 15))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("requests /statistics with the resolved date range and filters, and maps the response to the app-facing shape", async () => {
    mockedGet.mockResolvedValue({ data: RESPONSE_DATA })

    const { result } = renderHook(() => useStatistics(FILTERS), { wrapper })

    await waitFor(() => expect(result.current.statistics.currency).toBe("eur"))

    expect(mockedGet).toHaveBeenCalledWith("/statistics", {
      params: {
        from: "2026-08-01",
        to: "2026-08-31",
        account_codes: ["acc_1"],
        category: "rent",
        payment_method: "cash",
      },
    })
    expect(result.current.statistics.current.dailyTotals[0]).toEqual({
      date: "2026-08-01",
      cumulativeIncome: "100.00",
      cumulativeExpenses: "40.00",
      cumulativeNetBalance: "60.00",
    })
    expect(result.current.statistics.current.forecastNetBalance).toBe("120.00")
    // `previous` never carries a forecast, per the response shape.
    expect(result.current.statistics.previous.forecastNetBalance).toBeNull()
  })

  it("defaults to a zero-valued statistics while loading and surfaces a failure via isError (FS-37-style default, never null)", async () => {
    mockedGet.mockRejectedValue(new Error("network down"))

    const { result } = renderHook(() => useStatistics(FILTERS), { wrapper })

    expect(result.current.statistics.current.dailyTotals).toEqual([])
    expect(result.current.statistics.current.totalIncome).toBe("0")
    expect(result.current.isLoading).toBe(true)

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.statistics.current.dailyTotals).toEqual([])
  })

  it("omits account_codes/category/payment_method from the request when unset", async () => {
    mockedGet.mockResolvedValue({ data: RESPONSE_DATA })

    renderHook(
      () =>
        useStatistics({
          accountCodes: [],
          category: null,
          paymentMethod: null,
          interval: { kind: "month", offset: 0 },
        }),
      { wrapper }
    )

    await waitFor(() => expect(mockedGet).toHaveBeenCalled())

    const params = mockedGet.mock.calls[0][1].params
    expect(params.account_codes).toBeUndefined()
    expect(params.category).toBeUndefined()
    expect(params.payment_method).toBeUndefined()
  })
})
