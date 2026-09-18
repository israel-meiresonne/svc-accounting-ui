import axios, { AxiosError } from "axios"

/**
 * The flat error shape every backend endpoint responds with, per the
 * discovery overview's "Errors" section: `{ code, message, details }`,
 * never wrapped in an outer `error` key.
 */
type ApiErrorShape = {
  code: string
  message: string
  details: Record<string, unknown>
}

export class ApiError extends Error {
  code: string
  details: Record<string, unknown>
  status?: number

  constructor({ code, message, details }: ApiErrorShape, status?: number) {
    super(message)
    this.name = "ApiError"
    this.code = code
    this.details = details
    this.status = status
  }
}

function isApiErrorShape(value: unknown): value is ApiErrorShape {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "message" in value &&
    "details" in value
  )
}

/**
 * `localStorage` key the token is persisted under. Must stay in sync
 * with `AUTH_TOKEN_STORAGE_KEY` in `lib/auth/auth-context.tsx`, which
 * writes the token here on login/signup. Duplicated as a literal,
 * rather than imported, because `auth-context.tsx` itself imports
 * `apiClient` from this file — importing the key the other way round
 * would make the two modules circular.
 */
const AUTH_TOKEN_STORAGE_KEY = "ledgr_os_auth_token"

/** Where the auth token lives, now that Phase 4 has a real place to read it from. */
function getToken(): string | null {
  if (typeof window === "undefined") return null

  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
}

/**
 * Endpoints whose own `401` means "these credentials are wrong" or "not
 * logged in yet", not "your session just died" — `AuthProvider` and the
 * login/signup forms already handle those cases themselves. Every other
 * endpoint's `401` means a previously-valid token stopped working (it
 * expired, or the user was logged out server-side), which is the case
 * this interceptor exists to turn into a redirect instead of a silently
 * broken page.
 */
const SESSION_EXEMPT_PATHS = ["users/login", "users/create", "users/me"]

function isSessionExemptRequest(url: string | undefined): boolean {
  if (!url) return false

  return SESSION_EXEMPT_PATHS.some((path) => url.includes(path))
}

export const apiClient = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/v1`,
})

apiClient.interceptors.request.use((config) => {
  const token = getToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const isDeadSession =
      error.response?.status === 401 && !isSessionExemptRequest(error.config?.url)

    if (isDeadSession && typeof window !== "undefined") {
      window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)

      if (!window.location.pathname.startsWith("/login")) {
        // A hard navigation, not `useRouter().push()`, is deliberate:
        // this interceptor runs in a plain module outside the React tree
        // (no router instance to call), and a full reload is exactly
        // what's wanted here anyway, since it forces `AuthProvider` to
        // remount and read the now-cleared token from scratch.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign("/login")
      }
    }

    if (isApiErrorShape(error.response?.data)) {
      throw new ApiError(error.response.data, error.response.status)
    }

    throw error
  }
)
