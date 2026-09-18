import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import Papa from "papaparse"

import { useAccountsQuery } from "@/lib/accounts/use-accounts"
import { usePreviewCsvImport, useCommitCsvImport, type PreviewRow } from "@/lib/accounts/use-csv-import"
import CsvImportDialog from "@/components/accounts/csv-import-dialog"

jest.mock("papaparse", () => ({
  parse: jest.fn(),
}))

jest.mock("@/lib/accounts/use-accounts", () => ({
  useAccountsQuery: jest.fn(),
}))

jest.mock("@/lib/accounts/use-csv-import", () => {
  const actual = jest.requireActual("@/lib/accounts/use-csv-import")

  return {
    ...actual,
    usePreviewCsvImport: jest.fn(),
    useCommitCsvImport: jest.fn(),
  }
})

const mockedParse = Papa.parse as jest.Mock
const mockedUseAccountsQuery = useAccountsQuery as jest.Mock
const mockedUsePreviewCsvImport = usePreviewCsvImport as jest.Mock
const mockedUseCommitCsvImport = useCommitCsvImport as jest.Mock

function previewRowFixture(overrides: Partial<PreviewRow>): PreviewRow {
  return {
    row: {
      account_code: "acc_01",
      occurred_at: "2026-03-01",
      amount: "-45.20",
      currency: "eur",
      payment_method: "credit_card",
      category: "Groceries",
      description: "Weekly shop",
      counterparty_type: "company",
      counterparty_first_name: null,
      counterparty_last_name: null,
      counterparty_company_name: "Carrefour Market",
      counterparty_email: null,
    },
    status: "ok",
    counterpartyCode: "usr_cp1",
    dedupHash: "hash1",
    duplicateGroupId: null,
    errors: [],
    ...overrides,
  }
}

async function selectFile(user: ReturnType<typeof userEvent.setup>) {
  const file = new File(["occurred_at,amount\n2026-03-01,-45.20"], "export.csv", {
    type: "text/csv",
  })

  await user.upload(screen.getByLabelText(/drop a file here or click to browse/i), file)
}

describe("<CsvImportDialog />", () => {
  beforeEach(() => {
    mockedParse.mockReset()
    mockedUseAccountsQuery.mockReset()
    mockedUsePreviewCsvImport.mockReset()
    mockedUseCommitCsvImport.mockReset()

    mockedUseAccountsQuery.mockReturnValue({
      accounts: [{ code: "acc_01", name: "Everyday Checking", currency: "eur" }],
    })
    mockedUseCommitCsvImport.mockReturnValue({ mutateAsync: jest.fn(), isPending: false })

    // No per-row `account` column in this fixture, so `CsvColumnMappingStep`
    // renders its single "Target account" picker rather than one per name.
    mockedParse.mockImplementation((_file, options) => {
      options.complete({ data: [{ occurred_at: "2026-03-01", amount: "-45.20" }] })
    })
  })

  it("renders one DuplicateGroupResolver per duplicate group, and only enables commit once every group is resolved", async () => {
    const previewRows = [
      previewRowFixture({ status: "ok", duplicateGroupId: null }),
      previewRowFixture({ status: "duplicate", duplicateGroupId: "group-1" }),
      previewRowFixture({ status: "duplicate", duplicateGroupId: "group-2" }),
    ]
    mockedUsePreviewCsvImport.mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue(previewRows),
    })

    const user = userEvent.setup()
    render(<CsvImportDialog open onOpenChange={jest.fn()} />)

    await selectFile(user)
    await user.click(await screen.findByRole("button", { name: /continue/i }))

    expect(await screen.findByText(/group #group-1/i)).toBeInTheDocument()
    expect(screen.getByText(/group #group-2/i)).toBeInTheDocument()

    const importButton = screen.getByRole("button", { name: /import_.*transactions/i })
    expect(importButton).toBeDisabled()

    const group1 = screen.getByRole("radiogroup", {
      name: /resolution for duplicate group group-1/i,
    })
    await user.click(within(group1).getByRole("radio", { name: /add anyway/i }))
    expect(importButton).toBeDisabled()

    const group2 = screen.getByRole("radiogroup", {
      name: /resolution for duplicate group group-2/i,
    })
    await user.click(within(group2).getByRole("radio", { name: /drop the new transaction/i }))

    await waitFor(() => {
      expect(importButton).not.toBeDisabled()
    })
  })

  it("enables commit immediately when the preview has no duplicate groups", async () => {
    mockedUsePreviewCsvImport.mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue([previewRowFixture({})]),
    })

    const user = userEvent.setup()
    render(<CsvImportDialog open onOpenChange={jest.fn()} />)

    await selectFile(user)
    await user.click(await screen.findByRole("button", { name: /continue/i }))

    const importButton = await screen.findByRole("button", { name: /import_.*transactions/i })
    expect(importButton).not.toBeDisabled()
  })
})
