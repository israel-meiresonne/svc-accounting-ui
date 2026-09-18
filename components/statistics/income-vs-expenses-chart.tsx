"use client"

import { Bar } from "react-chartjs-2"

import { ChartCard, LegendDot } from "@/components/statistics/chart-card"
import { ChartColor } from "@/components/statistics/chartjs-setup"
import { formatMoney } from "@/lib/money"

type PeriodTotals = {
  totalIncome: string
  totalExpenses: string
}

type IncomeVsExpensesChartProps = {
  current: PeriodTotals
  previous: PeriodTotals
  /** Not in the spec's own props table, but required by `formatMoney`, which that same table lists as a dependency — see this phase's report for why it's added here. */
  currency: string
}

const IncomeVsExpensesChart = ({ current, previous, currency }: IncomeVsExpensesChartProps) => {
  return (
    <ChartCard
      title="Income vs expenses"
      legend={
        <>
          <LegendDot colorClassName="bg-text-dim">Previous</LegendDot>
          <LegendDot colorClassName="bg-chart-1">Current</LegendDot>
        </>
      }
    >
      <Bar
        data={{
          labels: ["Income", "Expenses"],
          datasets: [
            {
              label: "Previous",
              data: [Number(previous.totalIncome), Number(previous.totalExpenses)],
              backgroundColor: ChartColor.previousSoft,
            },
            {
              label: "Current",
              data: [Number(current.totalIncome), Number(current.totalExpenses)],
              backgroundColor: [ChartColor.current, ChartColor.danger],
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

export default IncomeVsExpensesChart
