"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type CategoryFilterProps = {
  categories: string[]
  includedCategories: string[]
  onIncludedCategoriesChange: (next: string[]) => void
}

type BulkActionsProps = {
  categories: string[]
  onIncludedCategoriesChange: (next: string[]) => void
}

const BulkActions = ({ categories, onIncludedCategoriesChange }: BulkActionsProps) => (
  <div className="flex items-center justify-between px-2 pb-1 text-xs">
    <button
      type="button"
      className="text-accent-bright hover:underline"
      onClick={() => onIncludedCategoriesChange(categories)}
    >
      Select all
    </button>
    <button
      type="button"
      className="text-accent-bright hover:underline"
      onClick={() => onIncludedCategoriesChange([])}
    >
      Reset
    </button>
  </div>
)

/**
 * Presentational multi-select over every known category. Nothing checked
 * means no filter; checking narrows the view to just the checked ones —
 * the same semantics as the account checkboxes next to it. The page owns
 * both the category list and where the selection is stored.
 */
const CategoryFilter = ({ categories, includedCategories, onIncludedCategoriesChange }: CategoryFilterProps) => {
  const triggerLabel = includedCategories.length === 0 ? "All categories" : `${includedCategories.length} selected`

  const handleToggle = (category: string, checked: boolean) => {
    const next = checked
      ? [...includedCategories, category]
      : includedCategories.filter((included) => included !== category)

    onIncludedCategoriesChange(next)
  }

  // Radix closes the menu on item selection by default; toggling several
  // categories in one go needs it to stay open.
  const handleItemSelect = (event: Event) => event.preventDefault()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          {triggerLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Categories</DropdownMenuLabel>
        <BulkActions categories={categories} onIncludedCategoriesChange={onIncludedCategoriesChange} />
        <DropdownMenuSeparator />
        {categories.length === 0 ? (
          <DropdownMenuLabel className="font-normal text-muted-foreground">No categories yet</DropdownMenuLabel>
        ) : (
          categories.map((category) => (
            <DropdownMenuCheckboxItem
              key={category}
              checked={includedCategories.includes(category)}
              onCheckedChange={(checked) => handleToggle(category, checked)}
              onSelect={handleItemSelect}
            >
              {category}
            </DropdownMenuCheckboxItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default CategoryFilter
