"use client"

import CategoryBreakdownChart from "@/components/statistics/category-breakdown-chart"
import ForecastChart from "@/components/statistics/forecast-chart"
import IncomeVsExpensesByCategoryChart from "@/components/statistics/income-vs-expenses-by-category-chart"
import IncomeVsExpensesChart from "@/components/statistics/income-vs-expenses-chart"
import StatisticsFilterPanel from "@/components/statistics/statistics-filter-panel"
import TimeSeriesChart, { TimeSeriesMetric } from "@/components/statistics/time-series-chart"
import { useStatistics } from "@/lib/statistics/use-statistics"
import { useStatisticsFilters } from "@/lib/statistics/use-statistics-filters"

/**
 * Reads filters from the URL, fetches the aggregation exactly once via
 * `useStatistics`, and fans that single result out into all eight
 * required charts (per the phase spec's "Filter panel to aggregation to
 * charts" flow) — no chart component issues its own request.
 */
const StatisticsPage = () => {
  const { filters } = useStatisticsFilters()
  const { statistics, isLoading, isError } = useStatistics(filters)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl">Statistics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every chart compares the selected interval against the previous interval of the same length.
        </p>
      </div>

      <StatisticsFilterPanel />

      {isLoading ? <p className="text-sm text-muted-foreground">Loading statistics...</p> : null}
      {isError ? <p className="text-sm text-danger">Couldn&apos;t load statistics. Try again.</p> : null}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <TimeSeriesChart
          metric={TimeSeriesMetric.Income}
          current={statistics.current.dailyTotals}
          previous={statistics.previous.dailyTotals}
          currency={statistics.currency}
        />
        <TimeSeriesChart
          metric={TimeSeriesMetric.Expenses}
          current={statistics.current.dailyTotals}
          previous={statistics.previous.dailyTotals}
          currency={statistics.currency}
        />
        <TimeSeriesChart
          metric={TimeSeriesMetric.NetBalance}
          current={statistics.current.dailyTotals}
          previous={statistics.previous.dailyTotals}
          currency={statistics.currency}
        />

        <div className="md:col-span-2">
          <ForecastChart
            current={statistics.current.dailyTotals}
            previous={statistics.previous.dailyTotals}
            forecastNetBalance={statistics.current.forecastNetBalance}
            currency={statistics.currency}
          />
        </div>

        <IncomeVsExpensesChart
          current={{ totalIncome: statistics.current.totalIncome, totalExpenses: statistics.current.totalExpenses }}
          previous={{
            totalIncome: statistics.previous.totalIncome,
            totalExpenses: statistics.previous.totalExpenses,
          }}
          currency={statistics.currency}
        />
        <CategoryBreakdownChart
          title="Income by category"
          current={statistics.current.incomeByCategory}
          previous={statistics.previous.incomeByCategory}
          currency={statistics.currency}
        />

        <div className="md:col-span-2">
          <CategoryBreakdownChart
            title="Expenses by category"
            current={statistics.current.expensesByCategory}
            previous={statistics.previous.expensesByCategory}
            currency={statistics.currency}
            tall
          />
        </div>

        <div className="md:col-span-2">
          <IncomeVsExpensesByCategoryChart
            incomeByCategory={statistics.current.incomeByCategory}
            expensesByCategory={statistics.current.expensesByCategory}
            currency={statistics.currency}
          />
        </div>
      </div>
    </div>
  )
}

export default StatisticsPage
