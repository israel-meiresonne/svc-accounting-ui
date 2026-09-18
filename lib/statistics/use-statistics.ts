"use client"

import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"

import { apiClient } from "@/lib/api-client"
import { intervalToDateRange } from "@/lib/intervals"
import type { StatisticsFilters } from "@/lib/statistics/use-statistics-filters"
import type { CategoryAmount, DailyTotal, PeriodSummary, Statistics } from "@/lib/statistics/types"

type DailyTotalDto = {
  date: string
  cumulative_income: string
  cumulative_expenses: string
  cumulative_net_balance: string
}

type CategoryAmountDto = {
  category: string
  amount: string
}

type PeriodSummaryDto = {
  from: string
  to: string
  daily_totals: DailyTotalDto[]
  total_income: string
  total_expenses: string
  net_balance: string
  forecast_net_balance?: string
  income_by_category: CategoryAmountDto[]
  expenses_by_category: CategoryAmountDto[]
}

type StatisticsResponseDto = {
  currency: string
  current: PeriodSummaryDto
  previous: PeriodSummaryDto
}

function toDailyTotal(dto: DailyTotalDto): DailyTotal {
  return {
    date: dto.date,
    cumulativeIncome: dto.cumulative_income,
    cumulativeExpenses: dto.cumulative_expenses,
    cumulativeNetBalance: dto.cumulative_net_balance,
  }
}

function toCategoryAmount(dto: CategoryAmountDto): CategoryAmount {
  return { category: dto.category, amount: dto.amount }
}

function toPeriodSummary(dto: PeriodSummaryDto): PeriodSummary {
  return {
    from: dto.from,
    to: dto.to,
    dailyTotals: dto.daily_totals.map(toDailyTotal),
    totalIncome: dto.total_income,
    totalExpenses: dto.total_expenses,
    netBalance: dto.net_balance,
    forecastNetBalance: dto.forecast_net_balance ?? null,
    incomeByCategory: dto.income_by_category.map(toCategoryAmount),
    expensesByCategory: dto.expenses_by_category.map(toCategoryAmount),
  }
}

function toStatistics(dto: StatisticsResponseDto): Statistics {
  return {
    currency: dto.currency,
    current: toPeriodSummary(dto.current),
    previous: toPeriodSummary(dto.previous),
  }
}

const ZERO_PERIOD_SUMMARY: PeriodSummary = {
  from: "",
  to: "",
  dailyTotals: [],
  totalIncome: "0",
  totalExpenses: "0",
  netBalance: "0",
  forecastNetBalance: null,
  incomeByCategory: [],
  expensesByCategory: [],
}

const ZERO_STATISTICS: Statistics = {
  currency: "usd",
  current: ZERO_PERIOD_SUMMARY,
  previous: ZERO_PERIOD_SUMMARY,
}

function statisticsParams(filters: StatisticsFilters) {
  // Always resolved against "now", never a persisted reference date —
  // matches `IntervalNav`'s and `TransactionsPage`'s own convention.
  const { from, to } = intervalToDateRange(filters.interval, new Date())

  return {
    from: format(from, "yyyy-MM-dd"),
    to: format(to, "yyyy-MM-dd"),
    account_codes: filters.accountCodes.length > 0 ? filters.accountCodes : undefined,
    category: filters.category ?? undefined,
    payment_method: filters.paymentMethod ?? undefined,
  }
}

/**
 * The one TanStack Query hook every chart on the Statistics page reads
 * from (per the phase spec's "Filter panel to aggregation to charts"
 * flow) — no chart issues its own request. Keyed on the full filter
 * object, so each distinct filter combination gets its own cache entry.
 * `.data` is unwrapped with a safe zero-valued default here, matching
 * `useAccountsQuery`'s `ZERO_SUMMARY`/`useTransactions`'s
 * `EMPTY_TRANSACTIONS` pattern, so `StatisticsPage` never has to
 * null-check the result itself.
 */
export function useStatistics(filters: StatisticsFilters) {
  const query = useQuery({
    queryKey: ["statistics", filters],
    queryFn: async () => {
      const response = await apiClient.get<StatisticsResponseDto>("/statistics", {
        params: statisticsParams(filters),
      })
      return toStatistics(response.data)
    },
  })

  return {
    statistics: query.data ?? ZERO_STATISTICS,
    isLoading: query.isLoading,
    isError: query.isError,
  }
}
