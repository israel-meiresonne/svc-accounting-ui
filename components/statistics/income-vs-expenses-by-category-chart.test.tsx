import { render, screen } from "@testing-library/react"

import IncomeVsExpensesByCategoryChart from "@/components/statistics/income-vs-expenses-by-category-chart"
import type { CategoryAmount } from "@/lib/statistics/types"

type MockDataset = { label: string; data: number[] }

jest.mock("react-chartjs-2", () => ({
  Bar: (props: { data: { labels: string[]; datasets: MockDataset[] } }) => (
    <div
      data-testid="bar-chart"
      data-labels={JSON.stringify(props.data.labels)}
      data-datasets={JSON.stringify(props.data.datasets)}
    />
  ),
}))

const INCOME: CategoryAmount[] = [
  { category: "salary", amount: "5000.00" },
  { category: "freelance", amount: "1240.00" },
]

const EXPENSES: CategoryAmount[] = [
  { category: "rent", amount: "1450.00" },
  { category: "groceries", amount: "548.00" },
]

describe("<IncomeVsExpensesByCategoryChart />", () => {
  it("renders income categories as positive values and expense categories negated", () => {
    render(<IncomeVsExpensesByCategoryChart incomeByCategory={INCOME} expensesByCategory={EXPENSES} currency="eur" />)

    const labels = JSON.parse(screen.getByTestId("bar-chart").getAttribute("data-labels") ?? "[]")
    const datasets: MockDataset[] = JSON.parse(screen.getByTestId("bar-chart").getAttribute("data-datasets") ?? "[]")

    expect(labels).toEqual(["salary", "freelance", "rent", "groceries"])
    expect(datasets[0].data).toEqual([5000, 1240, -1450, -548])
  })

  it("caps each side at the top 5 categories by amount", () => {
    const manyIncomeCategories: CategoryAmount[] = Array.from({ length: 7 }, (_, index) => ({
      category: `category-${index}`,
      amount: String(100 - index),
    }))

    render(
      <IncomeVsExpensesByCategoryChart incomeByCategory={manyIncomeCategories} expensesByCategory={[]} currency="eur" />
    )

    const labels: string[] = JSON.parse(screen.getByTestId("bar-chart").getAttribute("data-labels") ?? "[]")
    expect(labels).toHaveLength(5)
    expect(labels).toEqual(["category-0", "category-1", "category-2", "category-3", "category-4"])
  })
})
