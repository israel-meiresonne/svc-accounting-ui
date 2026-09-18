"use client"

import type { ChangeEvent } from "react"

// Phase 5 (Accounts page) owns this hook. `FiltersBar`'s account
// multi-select and `MoveDialog`'s destination picker are the only two
// places this phase reads a user's full account list, and both reuse
// this one hook rather than each fetching accounts their own way.
import { useAccountsQuery } from "@/lib/accounts/use-accounts"
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, type PaymentMethodValue } from "@/lib/transactions/schemas"
import type { Interval } from "@/lib/intervals"
import IntervalNav from "@/components/interval-nav/interval-nav"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const ANY_PAYMENT_METHOD = "any"

export type TransactionsFilterValues = {
  accountCodes: string[]
  category: string
  paymentMethod: string
}

type FiltersBarProps = {
  interval: Interval
  filters: TransactionsFilterValues
  onIntervalChange: (interval: Interval) => void
  onFiltersChange: (filters: TransactionsFilterValues) => void
}

const FiltersBar = ({ interval, filters, onIntervalChange, onFiltersChange }: FiltersBarProps) => {
  const { accounts } = useAccountsQuery()

  const handleCategoryChange = (event: ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, category: event.target.value })
  }

  const handlePaymentMethodChange = (value: string) => {
    onFiltersChange({ ...filters, paymentMethod: value === ANY_PAYMENT_METHOD ? "" : value })
  }

  const handleAccountToggle = (accountCode: string, checked: boolean) => {
    const nextAccountCodes = checked
      ? [...filters.accountCodes, accountCode]
      : filters.accountCodes.filter((code) => code !== accountCode)

    onFiltersChange({ ...filters, accountCodes: nextAccountCodes })
  }

  const accountFilterLabel =
    filters.accountCodes.length === 0
      ? "All accounts"
      : `${filters.accountCodes.length} account${filters.accountCodes.length === 1 ? "" : "s"}`

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[3px] border border-border bg-card px-4 py-3">
      <IntervalNav interval={interval} onIntervalChange={onIntervalChange} />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            {accountFilterLabel}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {accounts.map((account) => (
            <DropdownMenuCheckboxItem
              key={account.code}
              checked={filters.accountCodes.includes(account.code)}
              onCheckedChange={(checked) => handleAccountToggle(account.code, !!checked)}
            >
              {account.name} ({account.currency.toUpperCase()})
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Input
        value={filters.category}
        onChange={handleCategoryChange}
        placeholder="Filter by category"
        aria-label="Filter by category"
        className="w-40"
      />

      <Select
        value={filters.paymentMethod === "" ? ANY_PAYMENT_METHOD : filters.paymentMethod}
        onValueChange={handlePaymentMethodChange}
      >
        <SelectTrigger aria-label="Filter by payment method" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY_PAYMENT_METHOD}>Any payment method</SelectItem>
          {PAYMENT_METHODS.map((method) => (
            <SelectItem key={method} value={method}>
              {PAYMENT_METHOD_LABELS[method as PaymentMethodValue]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default FiltersBar
