"use client"

import { useState } from "react"
import { format } from "date-fns"
import type { PaginationState, RowSelectionState, SortingState } from "@tanstack/react-table"

import { intervalToDateRange, type Interval } from "@/lib/intervals"
import { SortableColumn, useTransactions } from "@/lib/transactions/queries"
import BulkActionToolbar from "@/components/transactions/bulk-action-toolbar"
import { columns } from "@/components/transactions/columns"
import FiltersBar, { type TransactionsFilterValues } from "@/components/transactions/filters-bar"
import DataTable from "@/components/data-table/data-table"

const DEFAULT_INTERVAL: Interval = { kind: "month", offset: 0 }
const DEFAULT_FILTERS: TransactionsFilterValues = { accountCodes: [], category: "", paymentMethod: "" }
const DEFAULT_SORTING: SortingState = [{ id: SortableColumn.OccurredAt, desc: true }]
const DEFAULT_PAGINATION: PaginationState = { pageIndex: 0, pageSize: 10 }

const TransactionsPage = () => {
  const [interval, setIntervalValue] = useState<Interval>(DEFAULT_INTERVAL)
  const [filters, setFilters] = useState<TransactionsFilterValues>(DEFAULT_FILTERS)
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING)
  const [pagination, setPagination] = useState<PaginationState>(DEFAULT_PAGINATION)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const { from, to } = intervalToDateRange(interval, new Date())
  const activeSort = sorting[0] ?? DEFAULT_SORTING[0]

  const { transactions, meta } = useTransactions(
    {
      from: format(from, "yyyy-MM-dd"),
      to: format(to, "yyyy-MM-dd"),
      accountCodes: filters.accountCodes,
      category: filters.category,
      paymentMethod: filters.paymentMethod,
    },
    { column: activeSort.id as SortableColumn, order: activeSort.desc ? "desc" : "asc" },
    { pageIndex: pagination.pageIndex, pageSize: pagination.pageSize }
  )

  const selectedCodes = Object.keys(rowSelection).filter((code) => rowSelection[code])
  const selectedTransactions = transactions.filter((transaction) => selectedCodes.includes(transaction.code))

  const handleBulkActionSuccess = () => {
    setRowSelection({})
  }

  return (
    <div className="flex flex-col gap-5 p-6">
      <div>
        <h1 className="text-xl">Transactions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every transaction across all accounts — sortable and filterable on any column.
        </p>
      </div>

      <FiltersBar interval={interval} filters={filters} onIntervalChange={setIntervalValue} onFiltersChange={setFilters} />

      <BulkActionToolbar
        selectedCodes={selectedCodes}
        selectedTransactions={selectedTransactions}
        onActionSuccess={handleBulkActionSuccess}
      />

      <DataTable
        columns={columns}
        data={transactions}
        getRowId={(row) => row.code}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        sorting={sorting}
        onSortingChange={setSorting}
        manualSorting
        pagination={pagination}
        onPaginationChange={setPagination}
        manualPagination
        pageCount={meta.totalPages}
      />
    </div>
  )
}

export default TransactionsPage
