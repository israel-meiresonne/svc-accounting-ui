"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { parseIncludedCategories, setIncludedCategories } from "@/lib/categories/included-categories-param"
import { intervalToSearchParams, parseIntervalParams, type Interval } from "@/lib/intervals"
import { isPaymentMethod, type PaymentMethodValue } from "@/lib/transactions/schemas"

export type StatisticsFilters = {
  accountCodes: string[]
  includedCategories: string[]
  paymentMethod: PaymentMethodValue | null
  interval: Interval
}

export function parseStatisticsFilters(searchParams: URLSearchParams): StatisticsFilters {
  const accountsParam = searchParams.get("accounts")
  const paymentMethodParam = searchParams.get("payment_method")

  return {
    accountCodes: accountsParam ? accountsParam.split(",").filter((code) => code.length > 0) : [],
    includedCategories: parseIncludedCategories(searchParams),
    paymentMethod: paymentMethodParam !== null && isPaymentMethod(paymentMethodParam) ? paymentMethodParam : null,
    interval: parseIntervalParams(searchParams),
  }
}

export function statisticsFiltersToSearchParams(filters: StatisticsFilters): URLSearchParams {
  const params = intervalToSearchParams(filters.interval)

  if (filters.accountCodes.length > 0) params.set("accounts", filters.accountCodes.join(","))
  setIncludedCategories(params, filters.includedCategories)
  if (filters.paymentMethod) params.set("payment_method", filters.paymentMethod)

  return params
}

/**
 * Reads and writes the Statistics page's filter state, entirely from the
 * URL query string (`?accounts=...&included_categories=...&payment_method=...
 * &interval=...`), never local component state — this is the one place
 * `useSearchParams`/`useRouter` get called for this feature, per
 * `code-style-frontend-react-next`'s "wrap URL state in a small custom
 * hook" rule. Every periodic interval always resolves against "now"
 * (never a persisted reference date), matching `IntervalNav`'s and
 * `TransactionsPage`'s own established convention exactly.
 */
export function useStatisticsFilters() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const filters = parseStatisticsFilters(searchParams)

  const updateFilters = (partial: Partial<StatisticsFilters>) => {
    const next = statisticsFiltersToSearchParams({ ...filters, ...partial })
    router.push(`${pathname}?${next.toString()}`)
  }

  return { filters, updateFilters }
}
