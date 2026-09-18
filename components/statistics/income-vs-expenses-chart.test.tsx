import { render, screen } from "@testing-library/react"

import IncomeVsExpensesChart from "@/components/statistics/income-vs-expenses-chart"

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

describe("<IncomeVsExpensesChart />", () => {
  it("renders both the current and previous datasets across the income/expenses categories", () => {
    render(
      <IncomeVsExpensesChart
        current={{ totalIncome: "6240.00", totalExpenses: "4120.00" }}
        previous={{ totalIncome: "5180.00", totalExpenses: "4460.00" }}
        currency="eur"
      />
    )

    const labels = JSON.parse(screen.getByTestId("bar-chart").getAttribute("data-labels") ?? "[]")
    const datasets: MockDataset[] = JSON.parse(screen.getByTestId("bar-chart").getAttribute("data-datasets") ?? "[]")

    expect(labels).toEqual(["Income", "Expenses"])
    expect(datasets.find((d) => d.label === "Current")?.data).toEqual([6240, 4120])
    expect(datasets.find((d) => d.label === "Previous")?.data).toEqual([5180, 4460])
  })
})
