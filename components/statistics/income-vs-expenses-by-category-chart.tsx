"use client"

import { Bar } from "react-chartjs-2"

import { ChartCard, LegendDot } from "@/components/statistics/chart-card"
import { ChartColor } from "@/components/statistics/chartjs-setup"
import { formatMoney } from "@/lib/money"
import type { CategoryAmount } from "@/lib/statistics/types"

type IncomeVsExpensesByCategoryChartProps = {
  incomeByCategory: CategoryAmount[]
  expensesByCategory: CategoryAmount[]
  /** Not in the spec's own props table, but required by `formatMoney`, which that same table lists as a dependency — see this phase's report for why it's added here. */
  currency: string
}

const TOP_CATEGORIES_SHOWN = 5

function topCategories(entries: CategoryAmount[]): CategoryAmount[] {
  return [...entries].sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, TOP_CATEGORIES_SHOWN)
}

const IncomeVsExpensesByCategoryChart = ({
  incomeByCategory,
  expensesByCategory,
  currency,
}: IncomeVsExpensesByCategoryChartProps) => {
  const income = topCategories(incomeByCategory)
  // `expensesByCategory` amounts are positive decimal strings (per the
  // response shape's own example), so they're negated here — not by the
  // backend — to build the diverging chart the spec describes.
  const expenses = topCategories(expensesByCategory)
  const labels = [...income.map((item) => item.category), ...expenses.map((item) => item.category)]
  const values = [...income.map((item) => Number(item.amount)), ...expenses.map((item) => -Number(item.amount))]
  const colors = [...income.map(() => ChartColor.current), ...expenses.map(() => ChartColor.danger)]

  return (
    <ChartCard
      title="Income vs expenses by category"
      tall
      legend={
        <>
          <LegendDot colorClassName="bg-chart-1">Income (above the line)</LegendDot>
          <LegendDot colorClassName="bg-danger">Expenses (below the line)</LegendDot>
        </>
      }
      note="Top 5 categories by volume shown."
    >
      <Bar
        data={{
          labels,
          datasets: [
            {
              label: "Amount",
              data: values,
              backgroundColor: colors,
            },
          ],
        }}
        options={{
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (context) => formatMoney(Math.abs(Number(context.parsed.x)), currency),
              },
            },
          },
          scales: {
            x: { grid: { color: ChartColor.border } },
          },
        }}
      />
    </ChartCard>
  )
}

export default IncomeVsExpensesByCategoryChart
