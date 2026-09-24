import { render, screen } from "@testing-library/react"

import { CounterpartyType, PreviewRowStatus, type PreviewRow } from "@/lib/accounts/use-csv-import"
import CsvPreviewTable from "@/components/accounts/csv-preview-table"

function previewRowFixture(index: number): PreviewRow {
  return {
    row: {
      account_code: "acc_01",
      occurred_at: "2026-03-01",
      amount: "-45.20",
      currency: "eur",
      payment_method: "credit_card",
      category: "Groceries",
      description: `Weekly shop ${index}`,
      counterparty_type: CounterpartyType.Company,
      counterparty_first_name: null,
      counterparty_last_name: null,
      counterparty_company_name: "Carrefour Market",
      counterparty_email: null,
    },
    status: PreviewRowStatus.Ok,
    counterpartyCode: "usr_cp1",
    dedupHash: `hash${index}`,
    duplicateGroupId: null,
    errors: [],
  }
}

describe("<CsvPreviewTable />", () => {
  it("keeps a bounded, independently-scrollable height regardless of row count, so a large upload cannot push the dialog past the viewport", () => {
    const previewRows = Array.from({ length: 3330 }, (_, index) => previewRowFixture(index))

    render(<CsvPreviewTable previewRows={previewRows} />)

    const table = screen.getByRole("table")
    const scrollContainer = table.closest('[class*="max-h-"]')

    expect(scrollContainer).not.toBeNull()
    expect(scrollContainer).toHaveClass("overflow-y-auto")
  })
})
