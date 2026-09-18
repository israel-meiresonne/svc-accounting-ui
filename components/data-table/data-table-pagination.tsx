"use client"

import type { Table } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50] as const

type DataTablePaginationProps<TData> = {
  table: Table<TData>
}

function DataTablePagination<TData>({ table }: DataTablePaginationProps<TData>) {
  const handlePageSizeChange = (value: string) => {
    table.setPageSize(Number(value))
  }

  const handlePreviousPage = () => {
    table.previousPage()
  }

  const handleNextPage = () => {
    table.nextPage()
  }

  return (
    <div className="flex items-center justify-between gap-4 px-1 py-3 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <span>Rows per page</span>
        <Select value={`${table.getState().pagination.pageSize}`} onValueChange={handlePageSizeChange}>
          <SelectTrigger className="h-8 w-16">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((pageSize) => (
              <SelectItem key={pageSize} value={`${pageSize}`}>
                {pageSize}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-4">
        <span>
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePreviousPage} disabled={!table.getCanPreviousPage()}>
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextPage} disabled={!table.getCanNextPage()}>
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}

export default DataTablePagination
