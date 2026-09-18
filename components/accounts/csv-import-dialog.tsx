"use client"

import { useState } from "react"
import Papa from "papaparse"
import { toast } from "sonner"

import { useAccountsQuery } from "@/lib/accounts/use-accounts"
import {
  CounterpartyType,
  DuplicateResolution,
  PreviewRowStatus,
  usePreviewCsvImport,
  useCommitCsvImport,
  type CommitInput,
  type ImportRow,
  type PreviewRow,
} from "@/lib/accounts/use-csv-import"
import CsvColumnMappingStep, {
  type RawCsvRow,
  type ResolvedCsvRow,
} from "@/components/accounts/csv-column-mapping-step"
import CsvPreviewTable from "@/components/accounts/csv-preview-table"
import DuplicateGroupResolver from "@/components/accounts/duplicate-group-resolver"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const ImportStep = {
  SelectFile: "select-file",
  MapColumns: "map-columns",
  Preview: "preview",
  Done: "done",
} as const

type ImportStep = (typeof ImportStep)[keyof typeof ImportStep]

type CsvImportDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function toCounterpartyType(rawType: string | undefined): CounterpartyType {
  return rawType?.trim().toLowerCase() === CounterpartyType.Company
    ? CounterpartyType.Company
    : CounterpartyType.Contact
}

function splitCounterpartyName(name: string): {
  firstName: string | null
  lastName: string | null
} {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: null, lastName: null }

  const [firstName, ...rest] = parts
  return { firstName, lastName: rest.length > 0 ? rest.join(" ") : null }
}

/**
 * Turns one column-mapped CSV row into the exact flat shape the preview
 * endpoint expects, per the phase spec's "Raw CSV columns" and "Row
 * shape" sections: splitting `counterparty_name` into first/last name for
 * a `contact` row, or into a company name for a `company` row.
 */
function toImportRow(row: ResolvedCsvRow): ImportRow {
  const counterpartyType = toCounterpartyType(row.counterparty_type)
  const counterpartyName = row.counterparty_name || ""
  const { firstName, lastName } = splitCounterpartyName(counterpartyName)

  return {
    account_code: row.account_code,
    occurred_at: row.occurred_at,
    amount: row.amount,
    currency: row.currency,
    payment_method: row.payment_method,
    category: row.category,
    description: row.description,
    counterparty_type: counterpartyType,
    counterparty_first_name: counterpartyType === CounterpartyType.Contact ? firstName : null,
    counterparty_last_name: counterpartyType === CounterpartyType.Contact ? lastName : null,
    counterparty_company_name:
      counterpartyType === CounterpartyType.Company ? counterpartyName || null : null,
    counterparty_email: row.counterparty_email || null,
  }
}

function duplicateGroupIds(previewRows: PreviewRow[]): string[] {
  const ids = previewRows
    .map((row) => row.duplicateGroupId)
    .filter((id): id is string => id !== null)

  return Array.from(new Set(ids))
}

/** Every non-invalid preview row, echoing back what commit needs to
 * resolve its counterparty and detect duplicates again server-side, per
 * the phase spec's "Row shape sent to either endpoint below" section. */
function toCommitInputs(
  previewRows: PreviewRow[],
  resolutions: Record<string, DuplicateResolution>
): CommitInput[] {
  return previewRows
    .filter((row) => row.status !== PreviewRowStatus.Invalid)
    .map((row) => ({
      row: row.row,
      counterpartyCode: row.counterpartyCode ?? "",
      dedupHash: row.dedupHash ?? "",
      resolution: row.duplicateGroupId ? resolutions[row.duplicateGroupId] : undefined,
    }))
}

function countRowsToImport(commitInputs: CommitInput[]): number {
  return commitInputs.filter((input) => input.resolution !== DuplicateResolution.Drop).length
}

/**
 * Owns the multi-step local state (`'select-file' | 'map-columns' |
 * 'preview' | 'done'`) the phase spec describes for the CSV upload flow.
 */
const CsvImportDialog = ({ open, onOpenChange }: CsvImportDialogProps) => {
  const { accounts } = useAccountsQuery()
  const previewImport = usePreviewCsvImport()
  const commitImport = useCommitCsvImport()

  const [step, setStep] = useState<ImportStep>(ImportStep.SelectFile)
  const [fileName, setFileName] = useState<string | null>(null)
  const [parsedRows, setParsedRows] = useState<RawCsvRow[]>([])
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([])
  const [resolutions, setResolutions] = useState<Record<string, DuplicateResolution>>({})
  const [importedCount, setImportedCount] = useState(0)

  const resetState = () => {
    setStep(ImportStep.SelectFile)
    setFileName(null)
    setParsedRows([])
    setPreviewRows([])
    setResolutions({})
    setImportedCount(0)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetState()
    onOpenChange(nextOpen)
  }

  const handleFileSelected = (file: File) => {
    setFileName(file.name)

    Papa.parse<RawCsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setParsedRows(results.data)
        setStep(ImportStep.MapColumns)
      },
      error: () => {
        toast.error("Couldn't read that file. Please try another CSV export.")
      },
    })
  }

  const handleColumnsResolved = async (resolvedRows: ResolvedCsvRow[]) => {
    try {
      const rows = await previewImport.mutateAsync(resolvedRows.map(toImportRow))
      setPreviewRows(rows)
      setStep(ImportStep.Preview)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't preview this import.")
    }
  }

  const groupIds = duplicateGroupIds(previewRows)
  const isReadyToCommit = groupIds.every((groupId) => resolutions[groupId] !== undefined)
  const commitInputs = toCommitInputs(previewRows, resolutions)
  const importCount = countRowsToImport(commitInputs)

  const handleCommit = async () => {
    try {
      const count = await commitImport.mutateAsync(commitInputs)
      setImportedCount(count)
      setStep(ImportStep.Done)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't import these transactions.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>$ Upload transactions from CSV</DialogTitle>
        </DialogHeader>

        {step === ImportStep.SelectFile ? (
          <div className="flex flex-col gap-3">
            <p className="text-xs tracking-wide text-muted-foreground uppercase">
              Step 1 — Select file
            </p>
            <label
              htmlFor="csv-file-input"
              className="flex cursor-pointer flex-col items-center gap-2 rounded-[3px] border border-dashed border-border p-8 text-center"
            >
              <span className="text-card-foreground">
                {fileName ?? "Drop a file here or click to browse"}
              </span>
              <span className="text-sm text-muted-foreground">CSV files only</span>
            </label>
            <input
              id="csv-file-input"
              type="file"
              accept=".csv"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) handleFileSelected(file)
              }}
            />
          </div>
        ) : null}

        {step === ImportStep.MapColumns ? (
          <CsvColumnMappingStep
            parsedRows={parsedRows}
            accounts={accounts}
            onResolved={handleColumnsResolved}
          />
        ) : null}

        {step === ImportStep.Preview ? (
          <div className="flex flex-col gap-4">
            <CsvPreviewTable previewRows={previewRows} />

            {groupIds.map((groupId) => (
              <DuplicateGroupResolver
                key={groupId}
                groupId={groupId}
                rows={previewRows.filter((row) => row.duplicateGroupId === groupId)}
                resolution={resolutions[groupId]}
                onResolutionChange={(id, resolution) =>
                  setResolutions((prev) => ({ ...prev, [id]: resolution }))
                }
              />
            ))}

            <div
              role="status"
              className="rounded-[3px] border border-accent-bright bg-accent-soft px-4 py-3 text-sm text-text-bright"
            >
              This is a preview — nothing is saved yet. {importCount} row(s) are ready to import.
            </div>
          </div>
        ) : null}

        {step === ImportStep.Done ? (
          <div
            role="status"
            className="rounded-[3px] border border-accent-bright bg-accent-soft px-4 py-3 text-sm text-text-bright"
          >
            Imported {importedCount} transaction(s).
          </div>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            className="uppercase"
            onClick={() => handleOpenChange(false)}
          >
            {step === ImportStep.Done ? "Close" : "Cancel"}
          </Button>
          {step === ImportStep.Preview ? (
            <Button
              type="button"
              className="uppercase"
              disabled={!isReadyToCommit || commitImport.isPending}
              onClick={handleCommit}
            >
              {commitImport.isPending ? "Importing..." : `$ IMPORT_${importCount}_TRANSACTIONS`}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CsvImportDialog
