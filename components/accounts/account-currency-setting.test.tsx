import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { apiClient } from "@/lib/api-client"
import AuthProvider, { AUTH_TOKEN_STORAGE_KEY, useAuth } from "@/lib/auth/auth-context"
import AccountCurrencySetting from "@/components/accounts/account-currency-setting"

/**
 * Exercises the real `useUpdateCurrency` hook against a mocked
 * `apiClient`, wired up exactly the way `AccountsPage` wires this
 * component: a small harness reads `useAuth().user.currency` and passes
 * it straight through as `currentCurrency`, so a successful save (which
 * writes into `AuthProvider` via `updateUser`) is what actually drives
 * the prop this component displays — not a mocked return value.
 */
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}))

jest.mock("@/lib/api-client", () => {
  const actual = jest.requireActual("@/lib/api-client")

  return {
    ...actual,
    apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
  }
})

const mockedGet = apiClient.get as jest.Mock
const mockedPatch = apiClient.patch as jest.Mock

function CurrentUserHarness() {
  const { user } = useAuth()

  if (!user) return <p>Loading current user...</p>

  return <AccountCurrencySetting currentCurrency={user.currency} />
}

function renderWithProviders() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CurrentUserHarness />
      </AuthProvider>
    </QueryClientProvider>
  )
}

describe("<AccountCurrencySetting />", () => {
  beforeEach(() => {
    window.localStorage.clear()
    mockedGet.mockReset()
    mockedPatch.mockReset()
  })

  it("updates the displayed main currency once the save resolves", async () => {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, "valid-token")
    mockedGet.mockResolvedValue({
      data: {
        user: {
          code: "usr_1",
          first_name: "Priya",
          last_name: "Nair",
          email: "priya@nimbus.dev",
          currency: "usd",
        },
      },
    })
    mockedPatch.mockResolvedValue({
      data: {
        user: {
          code: "usr_1",
          first_name: "Priya",
          last_name: "Nair",
          email: "priya@nimbus.dev",
          currency: "eur",
        },
      },
    })

    const user = userEvent.setup()
    renderWithProviders()

    const trigger = await screen.findByRole("combobox", { name: /main currency/i })
    expect(trigger).toHaveTextContent("USD")

    await user.click(trigger)
    await user.click(await screen.findByRole("option", { name: "EUR" }))

    await waitFor(() => {
      expect(mockedPatch).toHaveBeenCalledWith("/users/me", { currency: "eur" })
    })
    expect(await screen.findByRole("combobox", { name: /main currency/i })).toHaveTextContent(
      "EUR"
    )
  })
})
