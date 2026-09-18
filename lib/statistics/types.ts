/**
 * App-facing (camelCase) shapes for the Statistics page's aggregation
 * response, per Phase 8's spec ("Response shape"). The wire (snake_case)
 * DTOs and the transformer between the two live in `use-statistics.ts`,
 * the one place that actually talks to the API — everything downstream
 * (every chart component, the page itself) only ever sees these types.
 */

export type DailyTotal = {
  date: string
  cumulativeIncome: string
  cumulativeExpenses: string
  cumulativeNetBalance: string
}

export type CategoryAmount = {
  category: string
  amount: string
}

export type PeriodSummary = {
  from: string
  to: string
  dailyTotals: DailyTotal[]
  totalIncome: string
  totalExpenses: string
  netBalance: string
  /** Present only for `current` (`include_forecast: true` server-side); always `null` for `previous`. */
  forecastNetBalance: string | null
  incomeByCategory: CategoryAmount[]
  expensesByCategory: CategoryAmount[]
}

export type Statistics = {
  currency: string
  current: PeriodSummary
  previous: PeriodSummary
}
