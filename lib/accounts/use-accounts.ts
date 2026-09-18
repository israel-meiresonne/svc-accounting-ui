"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { apiClient } from "@/lib/api-client"

export const ACCOUNTS_QUERY_KEY = ["accounts"] as const

/**
 * Matches `Currencies::Money#as_json` on the backend: a decimal amount,
 * always sent as a string, plus its lowercase currency code.
 */
export type Money = {
  amount: string
  currency: string
}

export type Account = {
  code: string
  name: string
  currency: string
  balance: Money
  hasTransactions: boolean
}

type MoneyDto = {
  amount: string
  currency: string
}

type AccountDto = {
  code: string
  name: string
  currency: string
  balance: MoneyDto
  has_transactions: boolean
}

type AccountsResponseDto = {
  accounts: AccountDto[]
  summary: MoneyDto
}

function toAccount(dto: AccountDto): Account {
  return {
    code: dto.code,
    name: dto.name,
    currency: dto.currency,
    balance: dto.balance,
    hasTransactions: dto.has_transactions,
  }
}

/**
 * Only used before the first successful fetch resolves. The backend's own
 * `GET /api/v1/accounts` never returns a `null` summary (`Accounts::SumAll`
 * always produces a real zero-amount value, per the phase spec), so this
 * default is purely for the brief window before that response exists —
 * `AccountsPage` renders a loading state during that window rather than
 * this value ever reaching the screen.
 */
const ZERO_SUMMARY: Money = { amount: "0", currency: "usd" }

export function useAccountsQuery() {
  const result = useQuery({
    queryKey: ACCOUNTS_QUERY_KEY,
    queryFn: async () => {
      const response = await apiClient.get<AccountsResponseDto>("/accounts")

      return {
        accounts: response.data.accounts.map(toAccount),
        summary: response.data.summary,
      }
    },
  })

  return {
    ...result,
    // The accounts list is this hook's headline value, so `data` aliases
    // straight to it (other callers of this hook — e.g. Phase 7's
    // `FiltersBar`/`MoveDialog` — destructure `{ data: accounts = [] }`,
    // the plain TanStack Query convention). `summary` rides alongside as
    // a second derived field since one API call already returns both.
    data: result.data?.accounts ?? [],
    accounts: result.data?.accounts ?? [],
    summary: result.data?.summary ?? ZERO_SUMMARY,
  }
}

export type CreateAccountPayload = {
  name: string
  currency: string
  initial_balance: string | null
  current_balance: string | null
}

export function useCreateAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreateAccountPayload) => {
      const response = await apiClient.post<{ account: AccountDto }>("/accounts", payload)
      return toAccount(response.data.account)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY })
    },
  })
}

export type UpdateAccountPayload = {
  code: string
  name: string
  currency: string
}

export function useUpdateAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ code, ...attributes }: UpdateAccountPayload) => {
      const response = await apiClient.patch<{ account: AccountDto }>(
        `/accounts/${code}`,
        attributes
      )
      return toAccount(response.data.account)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY })
    },
  })
}

export function useDeleteAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (code: string) => {
      await apiClient.delete(`/accounts/${code}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY })
    },
  })
}
