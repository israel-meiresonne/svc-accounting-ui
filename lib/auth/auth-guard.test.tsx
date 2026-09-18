import { render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { apiClient, ApiError } from "@/lib/api-client"
import AuthProvider, { AUTH_TOKEN_STORAGE_KEY } from "@/lib/auth/auth-context"
import AuthGuard from "@/lib/auth/auth-guard"

/**
 * `AuthProvider` now rehydrates `/users/me` via `useQuery` (see
 * `lib/auth/auth-context.tsx`), which requires a `QueryClientProvider`
 * ancestor. A fresh client per test avoids cache bleed between cases —
 * `retry: false` keeps a rejected mock rejection from being retried and
 * timing the test out.
 */
function renderWithProviders(children: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

const mockReplace = jest.fn()
const mockPush = jest.fn()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
}))

jest.mock("@/lib/api-client", () => {
  const actual = jest.requireActual("@/lib/api-client")

  return {
    ...actual,
    apiClient: { get: jest.fn(), post: jest.fn() },
  }
})

const mockedGet = apiClient.get as jest.Mock

describe("<AuthGuard />", () => {
  beforeEach(() => {
    window.localStorage.clear()
    mockReplace.mockClear()
    mockPush.mockClear()
    mockedGet.mockReset()
  })

  it("redirects to /login when there is no stored token", async () => {
    renderWithProviders(
      <AuthProvider>
        <AuthGuard>
          <p>Protected content</p>
        </AuthGuard>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login")
    })
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument()
  })

  it("redirects to /login when the stored token fails to rehydrate", async () => {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, "expired-token")
    mockedGet.mockRejectedValue(
      new ApiError({ code: "unauthorized", message: "Missing or invalid token", details: {} }, 401)
    )

    renderWithProviders(
      <AuthProvider>
        <AuthGuard>
          <p>Protected content</p>
        </AuthGuard>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login")
    })
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument()
  })

  it("renders children once GET /api/v1/users/me resolves", async () => {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, "valid-token")
    mockedGet.mockResolvedValue({
      data: {
        user: {
          code: "usr_123",
          first_name: "Priya",
          last_name: "Nair",
          email: "priya@nimbus.dev",
          currency: "usd",
        },
      },
    })

    renderWithProviders(
      <AuthProvider>
        <AuthGuard>
          <p>Protected content</p>
        </AuthGuard>
      </AuthProvider>
    )

    expect(await screen.findByText("Protected content")).toBeInTheDocument()
    expect(mockReplace).not.toHaveBeenCalled()
  })
})
