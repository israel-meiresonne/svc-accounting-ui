import { cn } from "@/lib/utils"
import { CounterpartyType, PreviewRowStatus, type PreviewRow } from "@/lib/accounts/use-csv-import"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function counterpartyName(row: PreviewRow["row"]): string {
  if (row.counterparty_type === CounterpartyType.Company) {
    return row.counterparty_company_name ?? ""
  }

  return [row.counterparty_first_name, row.counterparty_last_name].filter(Boolean).join(" ")
}

function rowClassName(status: PreviewRow["status"]): string {
  if (status === PreviewRowStatus.Invalid) return "bg-danger-soft"
  if (status === PreviewRowStatus.Duplicate) return "bg-warn-soft"
  return ""
}

type CsvPreviewTableProps = {
  previewRows: PreviewRow[]
}

/**
 * A fixed-shape table of exactly a transaction's columns, per the phase
 * spec — not the generic `components/data-table/` recipe, which is built
 * for sortable/paginated data this preview never needs.
 */
const CsvPreviewTable = ({ previewRows }: CsvPreviewTableProps) => {
  return (
    <div className="max-h-[50vh] overflow-y-auto rounded-[3px] border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Currency</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Counterparty</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {previewRows.map((previewRow, index) => (
            <TableRow
              key={`${previewRow.row.occurred_at}-${index}`}
              className={cn(rowClassName(previewRow.status))}
            >
              <TableCell>{previewRow.row.occurred_at}</TableCell>
              <TableCell>{previewRow.row.amount}</TableCell>
              <TableCell>{previewRow.row.currency.toUpperCase()}</TableCell>
              <TableCell>{previewRow.row.category}</TableCell>
              <TableCell>{previewRow.row.description}</TableCell>
              <TableCell>{counterpartyName(previewRow.row)}</TableCell>
              <TableCell className="uppercase">{previewRow.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default CsvPreviewTable
