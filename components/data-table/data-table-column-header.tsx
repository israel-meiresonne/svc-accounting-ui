"use client"

import type { Column } from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type DataTableColumnHeaderProps<TData, TValue> = {
  column: Column<TData, TValue>
  title: string
  className?: string
}

function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn("text-sm font-medium", className)}>{title}</div>
  }

  const sortDirection = column.getIsSorted()

  const handleToggleSort = () => {
    column.toggleSorting(sortDirection === "asc")
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggleSort}
      className={cn("-ml-3 h-8 gap-1.5", className)}
    >
      <span>{title}</span>
      {sortDirection === "asc" ? (
        <ArrowUp className="size-3.5" />
      ) : sortDirection === "desc" ? (
        <ArrowDown className="size-3.5" />
      ) : (
        <ChevronsUpDown className="size-3.5 text-muted-foreground" />
      )}
    </Button>
  )
}

export default DataTableColumnHeader
