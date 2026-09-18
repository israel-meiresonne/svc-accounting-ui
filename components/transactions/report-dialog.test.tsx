import { render, screen } from "@testing-library/react"

import type { Transaction } from "@/lib/transactions/queries"
import ReportDialog from "@/components/transactions/report-dialog"

jest.mock("@/lib/transactions/queries", () => ({
  useGenerateReport: () => ({ mutateAsync: jest.fn(), isPending: false }),
  triggerDownload: jest.fn(),
}))

function makeTransaction(code: string, currency: string): Transaction {
  return {
    code,
    occurredAt: "2026-01-01",
    amount: "10.00",
    currency,
    category: "Groceries",
    paymentMethod: "credit_card",
    description: "",
    counterparty: { code: "usr_1", displayName: "Someone" },
    account: { code: "acc_1", name: "Checking", currency },
  }
}

describe("<ReportDialog />", () => {
  it("does not show a reporting-currency field for a single-currency selection", () => {
    render(
      <ReportDialog
        selectedCodes={["txn_1"]}
        selectedTransactions={[makeTransaction("txn_1", "eur")]}
        open
        onOpenChange={jest.fn()}
      />
    )

    expect(screen.queryByLabelText(/reporting currency/i)).not.toBeInTheDocument()
  })

  it("shows a reporting-currency field for a mixed-currency selection", () => {
    render(
      <ReportDialog
        selectedCodes={["txn_1", "txn_2"]}
        selectedTransactions={[makeTransaction("txn_1", "eur"), makeTransaction("txn_2", "usd")]}
        open
        onOpenChange={jest.fn()}
      />
    )

    expect(screen.getByLabelText(/reporting currency/i)).toBeInTheDocument()
  })
})
