"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { apiClient } from "@/lib/api-client"
import type { LoginValues, SignupValues } from "@/lib/auth/schemas"

/**
 * `localStorage` key the token is persisted under. `lib/api-client.ts`
 * keeps its own copy of this same literal (see the comment there) rather
 * than importing it from here, since this module already imports
 * `apiClient` from `lib/api-client.ts` — importing the other way too
 * would make the two files circular.
 */
export const AUTH_TOKEN_STORAGE_KEY = "ledgr_os_auth_token"

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null

  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
}

function setStoredToken(token: string): void {
  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token)
}

function clearStoredToken(): void {
  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
}

export const AuthStatus = {
  Loading: "loading",
  Authenticated: "authenticated",
  Unauthenticated: "unauthenticated",
} as const

export type AuthStatus = (typeof AuthStatus)[keyof typeof AuthStatus]

export type User = {
  code: string
  firstName: string
  lastName: string
  email: string
  currency: string
}

type UserDto = {
  code: string
  first_name: string
  last_name: string
  email: string
  currency: string
}

function toUser(dto: UserDto): User {
  return {
    code: dto.code,
    firstName: dto.first_name,
    lastName: dto.last_name,
    email: dto.email,
    currency: dto.currency,
  }
}

type AuthResponseDto = {
  token: string
  user: UserDto
}

/**
 * Wire shape `POST /api/v1/users/create` actually expects (the phase
 * spec's route table: `{ first_name, last_name, email, password,
 * password_confirmation, currency }`), as opposed to `SignupValues`'
 * camelCase `firstName`/`lastName`/`passwordConfirmation` — this form's
 * own field names. Every key is translated here, not just
 * `password_confirmation`, so a `firstName`/`lastName` typo like the one
 * this replaced can't silently ship again.
 */
type SignupPayload = {
  first_name: string
  last_name: string
  email: string
  password: string
  password_confirmation: string
  currency: string
}

function toSignupPayload(values: SignupValues): SignupPayload {
  return {
    first_name: values.firstName,
    last_name: values.lastName,
    email: values.email,
    password: values.password,
    password_confirmation: values.passwordConfirmation,
    currency: values.currency,
  }
}

/** Query key the `/users/me` rehydration check is cached under. `login`
 * and `signup` write straight into this same cache entry via
 * `setQueryData` so a successful auth response doesn't trigger a second,
 * redundant `/users/me` round-trip just to learn what it was already
 * just told. */
const ME_QUERY_KEY = ["auth", "me"] as const

type AuthContextValue = {
  user: User | null
  status: AuthStatus
  login: (values: LoginValues) => Promise<void>
  signup: (values: SignupValues) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

type AuthProviderProps = {
  children: ReactNode
}

const AuthProvider = ({ children }: AuthProviderProps) => {
  const router = useRouter()
  const queryClient = useQueryClient()
  // Computed via a lazy initializer, rather than defaulted to `null` and
  // corrected inside an effect, so the very first render already reflects
  // whether a token survived from an earlier session.
  const [token, setToken] = useState<string | null>(() => getStoredToken())

  const meQuery = useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: async () => {
      try {
        const response = await apiClient.get<{ user: UserDto }>("/users/me")
        return toUser(response.data.user)
      } catch (error) {
        // Rehydration failed (an expired or invalid token) — clear it
        // from storage right here, a plain write to an external system,
        // rather than reacting to `isError` in a `useEffect` just to call
        // `setState`. `status` below still derives `Unauthenticated` from
        // `meQuery.isError` itself, so no React state needs to change for
        // that; `refetchOnWindowFocus`/`refetchOnReconnect` are off so a
        // token already known to be dead isn't retried against the API
        // again later in the session.
        clearStoredToken()
        throw error
      }
    },
    // Only runs at all once a token exists; `status` below treats "no
    // token" as `Unauthenticated` directly rather than firing a request
    // that would just 401.
    enabled: token !== null,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  const loginMutation = useMutation({
    mutationFn: async (values: LoginValues) => {
      const response = await apiClient.post<AuthResponseDto>("/users/login", values)
      return response.data
    },
  })

  const signupMutation = useMutation({
    mutationFn: async (values: SignupValues) => {
      const response = await apiClient.post<AuthResponseDto>(
        "/users/create",
        toSignupPayload(values)
      )
      return response.data
    },
  })

  const applyAuthResponse = (data: AuthResponseDto) => {
    setStoredToken(data.token)
    setToken(data.token)
    queryClient.setQueryData(ME_QUERY_KEY, toUser(data.user))
  }

  const login = async (values: LoginValues) => {
    applyAuthResponse(await loginMutation.mutateAsync(values))
  }

  const signup = async (values: SignupValues) => {
    applyAuthResponse(await signupMutation.mutateAsync(values))
  }

  const logout = () => {
    clearStoredToken()
    setToken(null)
    queryClient.removeQueries({ queryKey: ME_QUERY_KEY })
    router.push("/login")
  }

  const status: AuthStatus =
    token === null
      ? AuthStatus.Unauthenticated
      : meQuery.isSuccess
        ? AuthStatus.Authenticated
        : meQuery.isError
          ? AuthStatus.Unauthenticated
          : AuthStatus.Loading

  return (
    <AuthContext.Provider value={{ user: meQuery.data ?? null, status, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }

  return context
}

export default AuthProvider
