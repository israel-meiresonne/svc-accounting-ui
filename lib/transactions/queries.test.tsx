import type { ReactNode } from "react"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { apiClient } from "@/lib/api-client"
import { useTransactionStats } from "@/lib/transactions/queries"

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn() },
}))

const mockedGet = apiClient.get as jest.Mock

const ACCOUNT_CODE = "acc_checking"
const FROM = "2026-03-01T00:00:00.000Z"
const TO = "2026-03-31T23:59:59.999Z"

const STATS_RESPONSE = {
  data: {
    total_income: { amount: "1200.00", currency: "eur" },
    total_expenses: { amount: "450.00", currency: "eur" },
    net_balance: { amount: "750.00", currency: "eur" },
  },
}

/**
 * One `QueryClient` for the whole `renderHook`, deliberately: a fresh
 * client per render would make every rerender look like a cache miss,
 * which is exactly the behavior these tests are trying to measure.
 */
function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe("useTransactionStats", () => {
  beforeEach(() => {
    mockedGet.mockReset()
    mockedGet.mockResolvedValue(STATS_RESPONSE)
  })

  it("requests /transactions/stats with the account code and the interval's range, mapped to the app-facing shape", async () => {
    const { result } = renderHook(() => useTransactionStats(ACCOUNT_CODE, FROM, TO), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(mockedGet).toHaveBeenCalledWith("/transactions/stats", {
      params: { account_code: ACCOUNT_CODE, from: FROM, to: TO },
    })
    expect(result.current.stats).toEqual({
      totalIncome: { amount: "1200.00", currency: "eur" },
      totalExpenses: { amount: "450.00", currency: "eur" },
      netBalance: { amount: "750.00", currency: "eur" },
    })
  })

  it("refetches under a new cache key when from/to change, but not on an unrelated re-render", async () => {
    const { result, rerender } = renderHook(
      ({ from, to }: { from: string; to: string }) => useTransactionStats(ACCOUNT_CODE, from, to),
      { wrapper: createWrapper(), initialProps: { from: FROM, to: TO } }
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(mockedGet).toHaveBeenCalledTimes(1)

    // Same `from`/`to`: the cache key is unchanged, so the cached entry
    // is served and no second request goes out.
    rerender({ from: FROM, to: TO })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(mockedGet).toHaveBeenCalledTimes(1)

    // A different interval is a different cache key, never a stats
    // response cached under the previous range.
    rerender({ from: "2026-04-01T00:00:00.000Z", to: "2026-04-30T23:59:59.999Z" })

    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(2))
    expect(mockedGet).toHaveBeenLastCalledWith("/transactions/stats", {
      params: {
        account_code: ACCOUNT_CODE,
        from: "2026-04-01T00:00:00.000Z",
        to: "2026-04-30T23:59:59.999Z",
      },
    })
  })

  it("hands callers zero-valued stats before the first response resolves, never null", () => {
    const { result } = renderHook(() => useTransactionStats(ACCOUNT_CODE, FROM, TO), {
      wrapper: createWrapper(),
    })

    expect(result.current.stats.totalIncome.amount).toBe("0")
    expect(result.current.isLoading).toBe(true)
  })
})
