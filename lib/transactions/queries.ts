import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"

import { ACCOUNTS_QUERY_KEY, type Money } from "@/lib/accounts/use-accounts"
import { apiClient } from "@/lib/api-client"
import type { BulkUpdateAttributes, TransactionPayload } from "@/lib/transactions/schemas"

/**
 * Wire (DTO) shapes matching `TransactionSerializer` exactly — snake_case
 * field names, `amount` kept as the decimal *string* the backend sends
 * (never coerced to a JS `number`, which would reintroduce the float
 * precision problem `decimal(20,4)` + `BigDecimal` exists to avoid).
 */
type CounterpartyDto = {
  code: string
  display_name: string
}

type TransactionAccountDto = {
  code: string
  name: string
  currency: string
}

type TransactionDto = {
  code: string
  occurred_at: string
  amount: string
  currency: string
  category: string
  payment_method: string
  description: string
  counterparty: CounterpartyDto
  account: TransactionAccountDto
}

type PaginationMetaDto = {
  page: number
  per_page: number
  total_count: number
  total_pages: number
}

type TransactionsIndexResponseDto = {
  data: TransactionDto[]
  meta: PaginationMetaDto
}

// ---- App-facing (Model) shapes -------------------------------------------

export type Counterparty = {
  code: string
  displayName: string
}

export type TransactionAccount = {
  code: string
  name: string
  currency: string
}

export type Transaction = {
  code: string
  occurredAt: string
  amount: string
  currency: string
  category: string
  paymentMethod: string
  description: string
  counterparty: Counterparty
  account: TransactionAccount
}

export type PaginationMeta = {
  page: number
  perPage: number
  totalCount: number
  totalPages: number
}

function toTransaction(dto: TransactionDto): Transaction {
  return {
    code: dto.code,
    occurredAt: dto.occurred_at,
    amount: dto.amount,
    currency: dto.currency,
    category: dto.category,
    paymentMethod: dto.payment_method,
    description: dto.description,
    counterparty: { code: dto.counterparty.code, displayName: dto.counterparty.display_name },
    account: { code: dto.account.code, name: dto.account.name, currency: dto.account.currency },
  }
}

function toPaginationMeta(dto: PaginationMetaDto): PaginationMeta {
  return { page: dto.page, perPage: dto.per_page, totalCount: dto.total_count, totalPages: dto.total_pages }
}

// ---- Sorting --------------------------------------------------------------

/**
 * Mirrors `Transactions::Search::SORTABLE_COLUMNS` exactly. Column ids in
 * `components/transactions/columns.tsx` are set to these same literal
 * strings (rather than the app-facing camelCase field names) precisely so
 * a `SortingState` entry's `id` can be forwarded to the `sort` query
 * param with no remapping step.
 */
export const SortableColumn = {
  OccurredAt: "occurred_at",
  Amount: "amount",
  Category: "category",
  PaymentMethod: "payment_method",
} as const

export type SortableColumn = (typeof SortableColumn)[keyof typeof SortableColumn]

export type TransactionSort = {
  column: SortableColumn
  order: "asc" | "desc"
}

/**
 * Everything that narrows `GET /api/v1/transactions`'s result, including
 * the resolved `from`/`to` date range — `lib/intervals.ts`'s
 * `intervalToDateRange` output, already formatted to `yyyy-MM-dd` by the
 * caller. The phase spec's hooks table names this hook's first
 * parameter "filters"; the date range is folded into that same object
 * (rather than becoming a fourth `useTransactions` parameter) since it's
 * exactly as filter-shaped as `accountCodes`/`category`/`paymentMethod`
 * and must vary the cache key the same way they do.
 */
export type TransactionFilters = {
  from: string
  to: string
  accountCodes: string[]
  category: string
  paymentMethod: string
}

export type TransactionPage = {
  pageIndex: number
  pageSize: number
}

const TRANSACTIONS_QUERY_KEY = "transactions"

function buildTransactionsParams(
  filters: TransactionFilters,
  sort: TransactionSort,
  page: TransactionPage
): URLSearchParams {
  const params = new URLSearchParams()
  params.set("from", filters.from)
  params.set("to", filters.to)
  params.set("sort", sort.column)
  params.set("order", sort.order)
  params.set("page", String(page.pageIndex + 1))
  params.set("per_page", String(page.pageSize))

  filters.accountCodes.forEach((accountCode) => {
    params.append("filter[account_codes][]", accountCode)
  })
  if (filters.category.trim() !== "") {
    params.set("filter[category]", filters.category)
  }
  if (filters.paymentMethod.trim() !== "") {
    params.set("filter[payment_method]", filters.paymentMethod)
  }

  return params
}

const EMPTY_TRANSACTIONS: Transaction[] = []
const EMPTY_META: PaginationMeta = { page: 1, perPage: 0, totalCount: 0, totalPages: 0 }

/**
 * `GET /api/v1/transactions`. `.data`/`.meta` are unwrapped with safe
 * defaults here so `TransactionsPage` never has to null-check the query
 * result itself (FS-37).
 */
export function useTransactions(filters: TransactionFilters, sort: TransactionSort, page: TransactionPage) {
  const query = useQuery({
    queryKey: [TRANSACTIONS_QUERY_KEY, filters, sort, page],
    queryFn: async () => {
      const response = await apiClient.get<TransactionsIndexResponseDto>("/transactions", {
        params: buildTransactionsParams(filters, sort, page),
      })

      return {
        data: response.data.data.map(toTransaction),
        meta: toPaginationMeta(response.data.meta),
      }
    },
  })

  return {
    transactions: query.data?.data ?? EMPTY_TRANSACTIONS,
    meta: query.data?.meta ?? EMPTY_META,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  }
}

// ---- Single-transaction create / edit -------------------------------------

type TransactionResponseDto = {
  transaction: TransactionDto
}

/**
 * Every cache a single-transaction write invalidates.
 *
 * `[TRANSACTIONS_QUERY_KEY]` covers both caches this phase's spec names
 * separately: TanStack Query matches a query key by prefix, and both the
 * shared list key (`['transactions', filters, sort, page]`) and the stats
 * key (`['transactions', 'stats', accountCode, from, to]`) start with it.
 * `ACCOUNTS_QUERY_KEY` is the third: writing a transaction changes the
 * owning account's balance, which Phase 5's Accounts page reads.
 */
function invalidateAfterTransactionWrite(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: [TRANSACTIONS_QUERY_KEY] })
  queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY })
}

/** `POST /api/v1/transactions`. */
export function useCreateTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: TransactionPayload) => {
      const response = await apiClient.post<TransactionResponseDto>("/transactions", payload)
      return toTransaction(response.data.transaction)
    },
    onSuccess: () => {
      invalidateAfterTransactionWrite(queryClient)
    },
  })
}

type UpdateTransactionPayload = {
  code: string
  payload: TransactionPayload
}

/** `PATCH /api/v1/transactions/:code`. */
export function useUpdateTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ code, payload }: UpdateTransactionPayload) => {
      const response = await apiClient.patch<TransactionResponseDto>(`/transactions/${code}`, payload)
      return toTransaction(response.data.transaction)
    },
    onSuccess: () => {
      invalidateAfterTransactionWrite(queryClient)
    },
  })
}

// ---- Account stats --------------------------------------------------------

type TransactionStatsDto = {
  total_income: Money
  total_expenses: Money
  net_balance: Money
}

export type TransactionStats = {
  totalIncome: Money
  totalExpenses: Money
  netBalance: Money
}

function toTransactionStats(dto: TransactionStatsDto): TransactionStats {
  return {
    totalIncome: dto.total_income,
    totalExpenses: dto.total_expenses,
    netBalance: dto.net_balance,
  }
}

/**
 * Only reached before the first response resolves; the account page
 * renders a loading state over that window rather than these zeros, the
 * same `ZERO_SUMMARY`/`EMPTY_TRANSACTIONS` shape the rest of this
 * codebase's hooks already use instead of handing callers a `null`.
 */
const ZERO_STATS: TransactionStats = {
  totalIncome: { amount: "0", currency: "usd" },
  totalExpenses: { amount: "0", currency: "usd" },
  netBalance: { amount: "0", currency: "usd" },
}

/**
 * `GET /api/v1/transactions/stats`. `from`/`to` are part of the cache key,
 * not just `accountCode`, so switching intervals can never serve a stats
 * response that was cached under a different date range.
 */
export function useTransactionStats(accountCode: string, from: string, to: string) {
  const query = useQuery({
    queryKey: [TRANSACTIONS_QUERY_KEY, "stats", accountCode, from, to],
    queryFn: async () => {
      const response = await apiClient.get<TransactionStatsDto>("/transactions/stats", {
        params: { account_code: accountCode, from, to },
      })
      return toTransactionStats(response.data)
    },
  })

  return {
    stats: query.data ?? ZERO_STATS,
    isLoading: query.isLoading,
    isError: query.isError,
  }
}

// ---- Counterparty search --------------------------------------------------

type CounterpartySearchResultDto = {
  code: string
  display_name: string
  image: string | null
}

type CounterpartiesResponseDto = {
  counterparties: CounterpartySearchResultDto[]
}

/**
 * A counterparty as the picker's result list needs it. `image` is
 * deliberately dropped from the app-facing shape: the backend always
 * sends `null` for it in v1 (nothing in this discovery sets a `User`'s
 * image), so nothing downstream should be written as though it might not.
 */
export type CounterpartySearchResult = {
  code: string
  displayName: string
}

const EMPTY_COUNTERPARTIES: CounterpartySearchResult[] = []

/**
 * `GET /api/v1/users/counterparties`. Disabled for an empty query, since
 * the endpoint exists to narrow a search, not to enumerate every
 * counterparty a user has ever transacted with.
 */
export function useCounterpartySearch(query: string) {
  const trimmedQuery = query.trim()

  const result = useQuery({
    queryKey: ["users", "counterparties", trimmedQuery],
    queryFn: async () => {
      const response = await apiClient.get<CounterpartiesResponseDto>("/users/counterparties", {
        params: { q: trimmedQuery },
      })

      return response.data.counterparties.map((dto) => ({
        code: dto.code,
        displayName: dto.display_name,
      }))
    },
    enabled: trimmedQuery !== "",
  })

  return {
    counterparties: result.data ?? EMPTY_COUNTERPARTIES,
    isLoading: result.isLoading && trimmedQuery !== "",
    isError: result.isError,
  }
}

type BulkUpdatePayload = {
  transactionCodes: string[]
  attributes: BulkUpdateAttributes
}

/** `PATCH /api/v1/transactions/bulk`. */
export function useBulkUpdateTransactions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ transactionCodes, attributes }: BulkUpdatePayload) => {
      const response = await apiClient.patch<{ updated_count: number }>("/transactions/bulk", {
        transaction_codes: transactionCodes,
        attributes,
      })
      return response.data.updated_count
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TRANSACTIONS_QUERY_KEY] })
    },
  })
}

/**
 * `DELETE /api/v1/transactions/bulk`. Invalidates both `['transactions']`
 * and `['accounts']`: deleting transactions changes the owning account(s)'
 * balances, and Phase 5's Accounts page reads that same `['accounts']`
 * cache key — the same reasoning `useMoveTransactions` below documents.
 */
export function useBulkDeleteTransactions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (transactionCodes: string[]) => {
      const response = await apiClient.delete<{ deleted_count: number }>("/transactions/bulk", {
        data: { transaction_codes: transactionCodes },
      })
      return response.data.deleted_count
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TRANSACTIONS_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY })
    },
  })
}

type MovePayload = {
  transactionCodes: string[]
  destinationAccountCode: string
}

/**
 * `POST /api/v1/transactions/bulk/move`. Invalidates both `['transactions']`
 * and `['accounts']`: moving transactions changes both accounts' balances,
 * and Phase 5's Accounts page reads that same `['accounts']` cache key.
 */
export function useMoveTransactions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ transactionCodes, destinationAccountCode }: MovePayload) => {
      const response = await apiClient.post<{ moved_count: number }>("/transactions/bulk/move", {
        transaction_codes: transactionCodes,
        destination_account_code: destinationAccountCode,
      })
      return response.data.moved_count
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TRANSACTIONS_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY })
    },
  })
}

/**
 * `POST /api/v1/transactions/bulk/export_csv`. Invalidates nothing:
 * triggering a file download from a response blob doesn't change server
 * state.
 */
export function useExportTransactionsCsv() {
  return useMutation({
    mutationFn: async (transactionCodes: string[]) => {
      const response = await apiClient.post<Blob>(
        "/transactions/bulk/export_csv",
        { transaction_codes: transactionCodes },
        { responseType: "blob" }
      )
      return response.data
    },
  })
}

type GenerateReportPayload = {
  transactionCodes: string[]
  title: string
  description: string
  reportingCurrency?: string
}

/**
 * `POST /api/v1/transactions/bulk/generate_report`. Invalidates nothing,
 * same reasoning as `useExportTransactionsCsv`.
 */
export function useGenerateReport() {
  return useMutation({
    mutationFn: async ({ transactionCodes, title, description, reportingCurrency }: GenerateReportPayload) => {
      const response = await apiClient.post<Blob>(
        "/transactions/bulk/generate_report",
        {
          transaction_codes: transactionCodes,
          title,
          description,
          reporting_currency: reportingCurrency,
        },
        { responseType: "blob" }
      )
      return response.data
    },
  })
}

/**
 * Turns a blob response (the CSV export, the PDF report) into a browser
 * download. Lives here, next to the two hooks that produce such a blob,
 * rather than duplicated in both `BulkActionToolbar` (CSV) and
 * `ReportDialog` (PDF) — this codebase has no earlier download precedent
 * to defer to instead.
 */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
