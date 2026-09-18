"use client"

import { useState } from "react"
import {
  type ColumnDef,
  type OnChangeFn,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

import DataTablePagination from "@/components/data-table/data-table-pagination"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const DEFAULT_PAGINATION: PaginationState = { pageIndex: 0, pageSize: 10 }

type DataTableProps<TData> = {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  /**
   * Row identity for selection, keyed off a stable domain identifier
   * (e.g. `row.code`) rather than a table row index. Every caller that
   * exposes row selection outside the table (Phase 7's bulk actions, and
   * any later phase that does the same) must set this.
   */
  getRowId?: (row: TData) => string
  /**
   * Row selection, sorting, and pagination are all "optionally
   * controlled": pass the state + change handler together to drive the
   * table from the caller (needed once anything outside the table reads
   * that state, or once sorting/pagination happen server-side), or omit
   * both to fall back to this component's own internal state, exactly
   * like the original client-only table.
   */
  rowSelection?: RowSelectionState
  onRowSelectionChange?: OnChangeFn<RowSelectionState>
  sorting?: SortingState
  onSortingChange?: OnChangeFn<SortingState>
  /** Sorting is resolved server-side; disables `getSortedRowModel`. */
  manualSorting?: boolean
  pagination?: PaginationState
  onPaginationChange?: OnChangeFn<PaginationState>
  /** Pagination is resolved server-side (`data` is already one page); disables `getPaginationRowModel`. */
  manualPagination?: boolean
  /** Required when `manualPagination` is set, since the table can no longer derive it from `data.length`. */
  pageCount?: number
}

/**
 * The one generic table shell every phase-specific table (Phase 6's
 * single-account transaction table, Phase 7's cross-account table) is
 * built on. Sorting, pagination, and row selection are wired here;
 * column-specific filtering is deliberately not, since each caller's own
 * `columns` definition needs different filter fields.
 */
function DataTable<TData>({
  columns,
  data,
  getRowId,
  rowSelection,
  onRowSelectionChange,
  sorting,
  onSortingChange,
  manualSorting = false,
  pagination,
  onPaginationChange,
  manualPagination = false,
  pageCount,
}: DataTableProps<TData>) {
  const [internalRowSelection, setInternalRowSelection] = useState<RowSelectionState>({})
  const [internalSorting, setInternalSorting] = useState<SortingState>([])
  const [internalPagination, setInternalPagination] = useState<PaginationState>(DEFAULT_PAGINATION)

  const table = useReactTable({
    data,
    columns,
    getRowId,
    state: {
      rowSelection: rowSelection ?? internalRowSelection,
      sorting: sorting ?? internalSorting,
      pagination: pagination ?? internalPagination,
    },
    onRowSelectionChange: onRowSelectionChange ?? setInternalRowSelection,
    onSortingChange: onSortingChange ?? setInternalSorting,
    onPaginationChange: onPaginationChange ?? setInternalPagination,
    manualSorting,
    manualPagination,
    pageCount: manualPagination ? pageCount : undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
    getPaginationRowModel: manualPagination ? undefined : getPaginationRowModel(),
    enableRowSelection: true,
  })

  return (
    <div className="space-y-3">
      <div className="rounded-sm border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() ? "selected" : undefined}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
    </div>
  )
}

export default DataTable
