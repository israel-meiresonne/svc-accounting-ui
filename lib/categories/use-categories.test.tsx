import type { ReactNode } from "react"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { apiClient } from "@/lib/api-client"
import { useCategoriesQuery } from "@/lib/categories/use-categories"

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn() },
}))

const mockedGet = apiClient.get as jest.Mock

function createWrapper(queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe("useCategoriesQuery", () => {
  beforeEach(() => {
    mockedGet.mockReset()
    mockedGet.mockResolvedValue({ data: { categories: ["Groceries", "Rent"] } })
  })

  it("returns the response's categories array, unwrapped", async () => {
    const { result } = renderHook(() => useCategoriesQuery(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(mockedGet).toHaveBeenCalledWith("/transactions/categories")
    expect(result.current.categories).toEqual(["Groceries", "Rent"])
  })

  it("reloads the list whenever transactions are invalidated, since any write can add a category", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useCategoriesQuery(), { wrapper: createWrapper(queryClient) })
    await waitFor(() => expect(result.current.categories).toEqual(["Groceries", "Rent"]))

    mockedGet.mockResolvedValue({ data: { categories: ["Groceries", "Rent", "Travel"] } })
    await queryClient.invalidateQueries({ queryKey: ["transactions"] })

    await waitFor(() => expect(result.current.categories).toEqual(["Groceries", "Rent", "Travel"]))
  })

  it("returns an empty array, never undefined, before the first response resolves", () => {
    const { result } = renderHook(() => useCategoriesQuery(), { wrapper: createWrapper() })

    expect(result.current.categories).toEqual([])
    expect(result.current.isLoading).toBe(true)
  })
})
