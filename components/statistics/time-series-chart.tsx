"use client"

import { Line } from "react-chartjs-2"

import { ChartCard, LegendDot } from "@/components/statistics/chart-card"
import { ChartColor } from "@/components/statistics/chartjs-setup"
import { formatMoney } from "@/lib/money"
import type { DailyTotal } from "@/lib/statistics/types"

/**
 * The three cumulative metrics this one component covers, per the phase
 * spec ("`TimeSeriesChart`, income/expenses/net-balance, parameterized by
 * metric"). A const object + derived union, not a bare string-literal
 * union, per `code-style-frontend-react-next`'s fixed-set-of-values rule.
 */
export const TimeSeriesMetric = {
  Income: "income",
  Expenses: "expenses",
  NetBalance: "netBalance",
} as const

export type TimeSeriesMetric = (typeof TimeSeriesMetric)[keyof typeof TimeSeriesMetric]

type TimeSeriesChartProps = {
  metric: TimeSeriesMetric
  current: DailyTotal[]
  previous: DailyTotal[]
  /** Not in the spec's own props table, but required by `formatMoney`, which that same table lists as a dependency — see this phase's report for why it's added here. */
  currency: string
}

const METRIC_FIELD: Record<TimeSeriesMetric, keyof DailyTotal> = {
  income: "cumulativeIncome",
  expenses: "cumulativeExpenses",
  netBalance: "cumulativeNetBalance",
}

const METRIC_TITLE: Record<TimeSeriesMetric, string> = {
  income: "Total income",
  expenses: "Total expenses",
  netBalance: "Net balance",
}

const METRIC_COLOR: Record<TimeSeriesMetric, string> = {
  income: ChartColor.current,
  expenses: ChartColor.danger,
  netBalance: ChartColor.current,
}

const METRIC_FILL: Record<TimeSeriesMetric, string> = {
  income: ChartColor.accentSoft,
  expenses: ChartColor.dangerSoft,
  netBalance: ChartColor.accentSoft,
}

function seriesFor(dailyTotals: DailyTotal[], metric: TimeSeriesMetric): number[] {
  return dailyTotals.map((day) => Number(day[METRIC_FIELD[metric]]))
}

const TimeSeriesChart = ({ metric, current, previous, currency }: TimeSeriesChartProps) => {
  const field = METRIC_FIELD[metric]
  const latestCurrent = current.length > 0 ? Number(current[current.length - 1][field]) : 0
  const labels = current.map((day) => day.date)

  return (
    <ChartCard
      title={METRIC_TITLE[metric]}
      legend={
        <>
          <LegendDot colorClassName="bg-chart-1">Current</LegendDot>
          <LegendDot colorClassName="bg-text-dim">Previous</LegendDot>
        </>
      }
      statNum={formatMoney(latestCurrent, currency)}
    >
      <Line
        data={{
          labels,
          datasets: [
            {
              label: "Previous",
              data: seriesFor(previous, metric),
              borderColor: ChartColor.previous,
              borderDash: [4, 4],
              pointRadius: 0,
              tension: 0.25,
            },
            {
              label: "Current",
              data: seriesFor(current, metric),
              borderColor: METRIC_COLOR[metric],
              backgroundColor: METRIC_FILL[metric],
              fill: true,
              pointRadius: 0,
              tension: 0.25,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          interaction: { intersect: false, mode: "index" },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (context) => `${context.dataset.label}: ${formatMoney(context.parsed.y ?? 0, currency)}`,
              },
            },
          },
          scales: {
            x: { grid: { color: ChartColor.border } },
            y: { grid: { color: ChartColor.border } },
          },
        }}
      />
    </ChartCard>
  )
}

export default TimeSeriesChart
