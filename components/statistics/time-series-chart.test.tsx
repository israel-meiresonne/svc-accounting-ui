import { render, screen } from "@testing-library/react"

import TimeSeriesChart, { TimeSeriesMetric } from "@/components/statistics/time-series-chart"
import type { DailyTotal } from "@/lib/statistics/types"

type MockDataset = { label: string; data: (number | null)[] }

// Mocked at the module boundary (FS-48): `react-chartjs-2`/Chart.js is the
// external dependency this component calls out to — jsdom has no real
// canvas 2D context, so the mock renders the exact dataset shape the
// component built instead of a real chart, which is what these tests
// need to assert against.
jest.mock("react-chartjs-2", () => ({
  Line: (props: { data: { labels: string[]; datasets: MockDataset[] } }) => (
    <div data-testid="line-chart" data-datasets={JSON.stringify(props.data.datasets)} />
  ),
}))

function readDatasets(): MockDataset[] {
  return JSON.parse(screen.getByTestId("line-chart").getAttribute("data-datasets") ?? "[]")
}

const CURRENT: DailyTotal[] = [
  { date: "2026-08-01", cumulativeIncome: "100.00", cumulativeExpenses: "40.00", cumulativeNetBalance: "60.00" },
  { date: "2026-08-02", cumulativeIncome: "200.00", cumulativeExpenses: "80.00", cumulativeNetBalance: "120.00" },
]

const PREVIOUS: DailyTotal[] = [
  { date: "2026-07-01", cumulativeIncome: "90.00", cumulativeExpenses: "50.00", cumulativeNetBalance: "40.00" },
  { date: "2026-07-02", cumulativeIncome: "150.00", cumulativeExpenses: "70.00", cumulativeNetBalance: "80.00" },
]

describe("<TimeSeriesChart />", () => {
  it("renders both the current and previous cumulative series for the net balance metric", () => {
    render(
      <TimeSeriesChart metric={TimeSeriesMetric.NetBalance} current={CURRENT} previous={PREVIOUS} currency="eur" />
    )

    const datasets = readDatasets()
    expect(datasets).toHaveLength(2)
    expect(datasets.find((d) => d.label === "Current")?.data).toEqual([60, 120])
    expect(datasets.find((d) => d.label === "Previous")?.data).toEqual([40, 80])
  })

  it("switches series when parameterized for the income metric", () => {
    render(<TimeSeriesChart metric={TimeSeriesMetric.Income} current={CURRENT} previous={PREVIOUS} currency="eur" />)

    const datasets = readDatasets()
    expect(datasets.find((d) => d.label === "Current")?.data).toEqual([100, 200])
    expect(datasets.find((d) => d.label === "Previous")?.data).toEqual([90, 150])
    expect(screen.getByText("Total income")).toBeInTheDocument()
  })

  it("renders the formatted current total as the headline stat", () => {
    render(<TimeSeriesChart metric={TimeSeriesMetric.Income} current={CURRENT} previous={PREVIOUS} currency="eur" />)

    expect(screen.getByText(/200/)).toBeInTheDocument()
  })
})
