"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { format, parseISO } from "date-fns"

import type { Interval } from "@/lib/intervals"
import { isPaymentMethod, type PaymentMethodValue } from "@/lib/transactions/schemas"

const PERIODIC_INTERVAL_KINDS = ["month", "week", "last7days", "year", "trailingYear"] as const
type PeriodicIntervalKind = (typeof PERIODIC_INTERVAL_KINDS)[number]

export type StatisticsFilters = {
  accountCodes: string[]
  category: string | null
  paymentMethod: PaymentMethodValue | null
  interval: Interval
}

function isPeriodicIntervalKind(value: string): value is PeriodicIntervalKind {
  return (PERIODIC_INTERVAL_KINDS as readonly string[]).includes(value)
}

function parseInterval(searchParams: URLSearchParams): Interval {
  const kind = searchParams.get("interval")

  if (kind === "custom") {
    const from = searchParams.get("from")
    const to = searchParams.get("to")

    if (from && to) {
      return { kind: "custom", from: parseISO(from), to: parseISO(to) }
    }

    // An incomplete "custom" URL (no explicit range yet) falls back to
    // a sane default rather than crashing on it.
    return { kind: "month", offset: 0 }
  }

  const offsetParam = Number(searchParams.get("offset") ?? "0")
  const offset = Number.isFinite(offsetParam) ? offsetParam : 0

  return { kind: kind !== null && isPeriodicIntervalKind(kind) ? kind : "month", offset }
}

export function parseStatisticsFilters(searchParams: URLSearchParams): StatisticsFilters {
  const accountsParam = searchParams.get("accounts")
  const categoryParam = searchParams.get("category")
  const paymentMethodParam = searchParams.get("payment_method")

  return {
    accountCodes: accountsParam ? accountsParam.split(",").filter((code) => code.length > 0) : [],
    category: categoryParam && categoryParam.length > 0 ? categoryParam : null,
    paymentMethod: paymentMethodParam !== null && isPaymentMethod(paymentMethodParam) ? paymentMethodParam : null,
    interval: parseInterval(searchParams),
  }
}

export function statisticsFiltersToSearchParams(filters: StatisticsFilters): URLSearchParams {
  const params = new URLSearchParams()

  if (filters.accountCodes.length > 0) params.set("accounts", filters.accountCodes.join(","))
  if (filters.category) params.set("category", filters.category)
  if (filters.paymentMethod) params.set("payment_method", filters.paymentMethod)

  params.set("interval", filters.interval.kind)

  if (filters.interval.kind === "custom") {
    params.set("from", format(filters.interval.from, "yyyy-MM-dd"))
    params.set("to", format(filters.interval.to, "yyyy-MM-dd"))
  } else if (filters.interval.offset !== 0) {
    params.set("offset", String(filters.interval.offset))
  }

  return params
}

/**
 * Reads and writes the Statistics page's filter state, entirely from the
 * URL query string (`?accounts=...&category=...&payment_method=...
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
