import { render, screen } from "@testing-library/react"

import ForecastChart from "@/components/statistics/forecast-chart"
import type { DailyTotal } from "@/lib/statistics/types"

type MockDataset = { label: string; data: (number | null)[] }

jest.mock("react-chartjs-2", () => ({
  Line: (props: { data: { datasets: MockDataset[] } }) => (
    <div data-testid="line-chart" data-datasets={JSON.stringify(props.data.datasets)} />
  ),
}))

function readDatasets(): MockDataset[] {
  return JSON.parse(screen.getByTestId("line-chart").getAttribute("data-datasets") ?? "[]")
}

const CURRENT: DailyTotal[] = [
  { date: "2026-08-01", cumulativeIncome: "0", cumulativeExpenses: "0", cumulativeNetBalance: "400" },
  { date: "2026-08-08", cumulativeIncome: "0", cumulativeExpenses: "0", cumulativeNetBalance: "850" },
  { date: "2026-08-15", cumulativeIncome: "0", cumulativeExpenses: "0", cumulativeNetBalance: "1400" },
  { date: "2026-08-22", cumulativeIncome: "0", cumulativeExpenses: "0", cumulativeNetBalance: "1900" },
  { date: "2026-08-29", cumulativeIncome: "0", cumulativeExpenses: "0", cumulativeNetBalance: "2120" },
]

const PREVIOUS: DailyTotal[] = CURRENT.map((day) => ({ ...day, cumulativeNetBalance: "720" }))

describe("<ForecastChart />", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 7, 20))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("renders an elapsed current series, a projected forecast series, and a previous reference series", () => {
    render(<ForecastChart current={CURRENT} previous={PREVIOUS} forecastNetBalance="3457.90" currency="eur" />)

    const datasets = readDatasets()
    expect(datasets.map((d) => d.label)).toEqual(["Previous", "Current (elapsed)", "Forecast"])

    const previousDataset = datasets.find((d) => d.label === "Previous")
    expect(previousDataset?.data).toEqual([720, 720, 720, 720, 720])

    const elapsedDataset = datasets.find((d) => d.label === "Current (elapsed)")
    expect(elapsedDataset?.data.filter((value) => value !== null)).toEqual([400, 850, 1400])

    const forecastDataset = datasets.find((d) => d.label === "Forecast")
    expect(forecastDataset?.data[2]).toBe(1400)
    expect(forecastDataset?.data[4]).toBe(3457.9)
  })

  it("shows a not-enough-data message instead of a chart when the forecast is null", () => {
    render(<ForecastChart current={CURRENT} previous={PREVIOUS} forecastNetBalance={null} currency="eur" />)

    expect(screen.getByText(/not enough data yet/i)).toBeInTheDocument()
    expect(screen.queryByTestId("line-chart")).not.toBeInTheDocument()
  })
})
