"use client"

import { format } from "date-fns"
import type { ColumnDef } from "@tanstack/react-table"

import { formatMoney } from "@/lib/money"
import type { Transaction } from "@/lib/transactions/queries"
import { paymentMethodLabel } from "@/lib/transactions/schemas"
import DataTable from "@/components/data-table/data-table"

/**
 * This page's own columns, deliberately not Phase 7's cross-account
 * `columns.tsx`: there is no row-selection checkbox and no account
 * column here, since every row already belongs to the one account the
 * page is showing and bulk actions belong to the Transactions page.
 */
const columns: ColumnDef<Transaction, unknown>[] = [
  {
    id: "occurred_at",
    accessorKey: "occurredAt",
    header: "Date",
    cell: ({ row }) => format(new Date(row.original.occurredAt), "yyyy-MM-dd HH:mm"),
  },
  {
    id: "amount",
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => (
      <span className={Number(row.original.amount) < 0 ? "text-danger" : "text-accent-bright"}>
        {formatMoney(row.original.amount, row.original.currency)}
      </span>
    ),
  },
  {
    id: "currency",
    accessorKey: "currency",
    header: "Currency",
    cell: ({ row }) => row.original.currency.toUpperCase(),
  },
  {
    id: "payment_method",
    accessorKey: "paymentMethod",
    header: "Payment method",
    cell: ({ row }) => paymentMethodLabel(row.original.paymentMethod),
  },
  {
    id: "counterparty",
    accessorKey: "counterparty.displayName",
    header: "Counterparty",
  },
  {
    id: "category",
    accessorKey: "category",
    header: "Category",
  },
  {
    id: "description",
    accessorKey: "description",
    header: "Description",
  },
]

type AccountTransactionsTableProps = {
  transactions: Transaction[]
  onRowClick?: (transaction: Transaction) => void
}

/**
 * `onRowClick` is forwarded exactly as given, never defaulted to a no-op:
 * `DataTable` presence-checks it to decide whether a row gets button
 * semantics at all, so an always-present handler would make every row
 * announce itself as clickable even where this table is rendered read-only.
 */
const AccountTransactionsTable = ({ transactions, onRowClick }: AccountTransactionsTableProps) => {
  return (
    <DataTable
      columns={columns}
      data={transactions}
      getRowId={(transaction) => transaction.code}
      onRowClick={onRowClick}
    />
  )
}

export default AccountTransactionsTable
