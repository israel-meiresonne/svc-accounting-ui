import { render, screen } from "@testing-library/react"

import CategoryBreakdownChart from "@/components/statistics/category-breakdown-chart"
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

const CURRENT: CategoryAmount[] = [
  { category: "salary", amount: "5000.00" },
  { category: "freelance", amount: "1240.00" },
]

const PREVIOUS: CategoryAmount[] = [{ category: "salary", amount: "4500.00" }]

describe("<CategoryBreakdownChart />", () => {
  it("renders one bar-group per category present in either period, zero-filling a period missing it", () => {
    render(<CategoryBreakdownChart title="Income by category" current={CURRENT} previous={PREVIOUS} currency="eur" />)

    const labels = JSON.parse(screen.getByTestId("bar-chart").getAttribute("data-labels") ?? "[]")
    const datasets: MockDataset[] = JSON.parse(screen.getByTestId("bar-chart").getAttribute("data-datasets") ?? "[]")

    expect(labels).toEqual(["salary", "freelance"])
    expect(datasets.find((d) => d.label === "Current")?.data).toEqual([5000, 1240])
    // "freelance" has no previous-period entry — a zero bar, not an omitted one.
    expect(datasets.find((d) => d.label === "Previous")?.data).toEqual([4500, 0])
  })

  it("renders the given title, so the same component can serve both income and expenses", () => {
    render(<CategoryBreakdownChart title="Expenses by category" current={[]} previous={[]} currency="eur" />)

    expect(screen.getByText("Expenses by category")).toBeInTheDocument()
  })
})
