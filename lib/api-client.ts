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
 * Where the auth token lives. This phase has no auth yet, so it always
 * returns `null`; Phase 4 replaces this implementation, not this call
 * site, once it decides where the token is actually stored.
 */
function getToken(): string | null {
  return null
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
    if (isApiErrorShape(error.response?.data)) {
      throw new ApiError(error.response.data, error.response.status)
    }

    throw error
  }
)
