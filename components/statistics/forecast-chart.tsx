"use client"

import { parseISO } from "date-fns"
import { Line } from "react-chartjs-2"

import { ChartCard, LegendDot } from "@/components/statistics/chart-card"
import { ChartColor } from "@/components/statistics/chartjs-setup"
import { formatMoney } from "@/lib/money"
import type { DailyTotal } from "@/lib/statistics/types"

type ForecastChartProps = {
  current: DailyTotal[]
  previous: DailyTotal[]
  forecastNetBalance: string | null
  /** Not in the spec's own props table, but required by `formatMoney`, which that same table lists as a dependency — see this phase's report for why it's added here. */
  currency: string
}

function isElapsed(date: string, today: Date): boolean {
  return parseISO(date).getTime() <= today.getTime()
}

const ForecastChart = ({ current, previous, forecastNetBalance, currency }: ForecastChartProps) => {
  if (forecastNetBalance === null) {
    return (
      <ChartCard title="Net balance forecast — until end of current interval" tall>
        <div className="flex h-full items-center justify-center text-center text-sm text-text-dim">
          Not enough data yet — this interval hasn&apos;t started.
        </div>
      </ChartCard>
    )
  }

  const today = new Date()
  const labels = current.map((day) => day.date)
  const elapsedCount = current.filter((day) => isElapsed(day.date, today)).length
  const lastIndex = current.length - 1
  const elapsedNet = elapsedCount > 0 ? Number(current[elapsedCount - 1].cumulativeNetBalance) : 0

  const elapsedSeries = current.map((day, index) => (index < elapsedCount ? Number(day.cumulativeNetBalance) : null))

  // Only the bridge point (today) and the projected end point carry a
  // value; `spanGaps` draws the straight line between them, which is
  // exactly what a linear projection should look like.
  const forecastSeries = current.map((_, index) => {
    if (index === elapsedCount - 1) return elapsedNet
    if (index === lastIndex) return Number(forecastNetBalance)
    return null
  })

  const previousSeries = previous.map((day) => Number(day.cumulativeNetBalance))

  return (
    <ChartCard
      title="Net balance forecast — until end of current interval"
      tall
      legend={
        <>
          <LegendDot colorClassName="bg-chart-1">Current (elapsed)</LegendDot>
          <LegendDot colorClassName="bg-warn">Forecast (linear projection)</LegendDot>
          <LegendDot colorClassName="bg-text-dim">Previous (full interval)</LegendDot>
        </>
      }
      statNum={`${formatMoney(forecastNetBalance, currency)} projected`}
    >
      <Line
        data={{
          labels,
          datasets: [
            {
              label: "Previous",
              data: previousSeries,
              borderColor: ChartColor.previous,
              borderDash: [4, 4],
              pointRadius: 0,
            },
            {
              label: "Current (elapsed)",
              data: elapsedSeries,
              borderColor: ChartColor.current,
              pointRadius: 0,
            },
            {
              label: "Forecast",
              data: forecastSeries,
              borderColor: ChartColor.forecast,
              borderDash: [6, 5],
              spanGaps: true,
              pointRadius: 0,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (context) =>
                  context.parsed.y === null
                    ? ""
                    : `${context.dataset.label}: ${formatMoney(context.parsed.y, currency)}`,
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

export default ForecastChart
