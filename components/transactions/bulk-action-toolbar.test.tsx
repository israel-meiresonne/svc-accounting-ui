import { render, screen } from "@testing-library/react"

import BulkActionToolbar from "@/components/transactions/bulk-action-toolbar"

jest.mock("@/lib/transactions/queries", () => ({
  useExportTransactionsCsv: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useBulkDeleteTransactions: () => ({ mutateAsync: jest.fn(), isPending: false }),
  triggerDownload: jest.fn(),
}))

// Isolated at the module boundary (FS-48): this test exercises the
// toolbar's own selection-driven rendering and action wiring, not the
// three dialogs it opens — each of those has its own dedicated test.
jest.mock("@/components/transactions/bulk-update-dialog", () => ({
  __esModule: true,
  default: () => null,
}))
jest.mock("@/components/transactions/move-dialog", () => ({
  __esModule: true,
  default: () => null,
}))
jest.mock("@/components/transactions/report-dialog", () => ({
  __esModule: true,
  default: () => null,
}))

describe("<BulkActionToolbar />", () => {
  it("renders nothing when there is no selection", () => {
    const { container } = render(<BulkActionToolbar selectedCodes={[]} selectedTransactions={[]} />)

    expect(container).toBeEmptyDOMElement()
  })

  it("shows the selected count and every bulk action once rows are selected", () => {
    render(<BulkActionToolbar selectedCodes={["txn_1", "txn_2"]} selectedTransactions={[]} />)

    expect(screen.getByText("2 selected")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Update properties" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Move to another account" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Export CSV" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Generate PDF report" })).toBeInTheDocument()
  })
})
