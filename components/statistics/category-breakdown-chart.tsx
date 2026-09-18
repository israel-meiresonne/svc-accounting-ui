"use client"

import { Bar } from "react-chartjs-2"

import { ChartCard, LegendDot } from "@/components/statistics/chart-card"
import { ChartColor } from "@/components/statistics/chartjs-setup"
import { formatMoney } from "@/lib/money"
import type { CategoryAmount } from "@/lib/statistics/types"

type CategoryBreakdownChartProps = {
  title: string
  current: CategoryAmount[]
  previous: CategoryAmount[]
  /** Not in the spec's own props table, but required by `formatMoney`, which that same table lists as a dependency — see this phase's report for why it's added here. */
  currency: string
  /**
   * Not in the spec's own props table either. This one component renders
   * both "Income by category" (a normal-height card) and "Expenses by
   * category" (a `.tall` full-width card in the mockup) — since a single
   * component can't otherwise vary its own canvas height between its two
   * call sites, this is exposed as an opt-in prop rather than guessed
   * from `title`.
   */
  tall?: boolean
}

function amountFor(entries: CategoryAmount[], category: string): number {
  const entry = entries.find((item) => item.category === category)
  return entry ? Number(entry.amount) : 0
}

function distinctCategories(current: CategoryAmount[], previous: CategoryAmount[]): string[] {
  const seen = new Set<string>()
  const ordered: string[] = []

  for (const entry of [...current, ...previous]) {
    if (!seen.has(entry.category)) {
      seen.add(entry.category)
      ordered.push(entry.category)
    }
  }

  return ordered
}

const CategoryBreakdownChart = ({ title, current, previous, currency, tall = false }: CategoryBreakdownChartProps) => {
  const categories = distinctCategories(current, previous)

  return (
    <ChartCard
      title={title}
      tall={tall}
      legend={
        <>
          <LegendDot colorClassName="bg-text-dim">Previous</LegendDot>
          <LegendDot colorClassName="bg-chart-1">Current</LegendDot>
        </>
      }
    >
      <Bar
        data={{
          labels: categories,
          datasets: [
            {
              label: "Previous",
              data: categories.map((category) => amountFor(previous, category)),
              backgroundColor: ChartColor.previousSoft,
            },
            {
              label: "Current",
              data: categories.map((category) => amountFor(current, category)),
              backgroundColor: ChartColor.current,
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

export default CategoryBreakdownChart
