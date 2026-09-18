"use client"

import { format } from "date-fns"
import type { ColumnDef } from "@tanstack/react-table"

import { formatMoney } from "@/lib/money"
import { PAYMENT_METHOD_LABELS, isPaymentMethod } from "@/lib/transactions/schemas"
import type { Transaction } from "@/lib/transactions/queries"
import { Checkbox } from "@/components/ui/checkbox"
import DataTableColumnHeader from "@/components/data-table/data-table-column-header"

function paymentMethodLabel(paymentMethod: string): string {
  if (!isPaymentMethod(paymentMethod)) return paymentMethod
  return PAYMENT_METHOD_LABELS[paymentMethod]
}

/**
 * Column ids for the four sortable columns are set to the exact strings
 * `Transactions::Search::SORTABLE_COLUMNS` whitelists
 * (`occurred_at`/`amount`/`category`/`payment_method`), not the
 * app-facing camelCase accessor names, so `TransactionsPage` can forward
 * a `SortingState` entry's `id` straight into the `sort` query param.
 */
export const columns: ColumnDef<Transaction, unknown>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "occurred_at",
    accessorKey: "occurredAt",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
    cell: ({ row }) => format(new Date(row.original.occurredAt), "yyyy-MM-dd"),
  },
  {
    id: "amount",
    accessorKey: "amount",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" className="justify-end" />,
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
    enableSorting: false,
  },
  {
    id: "payment_method",
    accessorKey: "paymentMethod",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Payment method" />,
    cell: ({ row }) => paymentMethodLabel(row.original.paymentMethod),
  },
  {
    id: "counterparty",
    accessorKey: "counterparty.displayName",
    header: "Counterparty",
    enableSorting: false,
  },
  {
    id: "category",
    accessorKey: "category",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
  },
  {
    id: "description",
    accessorKey: "description",
    header: "Description",
    enableSorting: false,
  },
  {
    id: "account",
    accessorKey: "account.name",
    header: "Account",
    enableSorting: false,
  },
]
