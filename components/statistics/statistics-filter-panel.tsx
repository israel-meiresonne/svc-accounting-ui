"use client"

import { useState } from "react"

// Phase 5 (Accounts page) owns this hook; reused here the same way
// Phase 7's `FiltersBar` already does, rather than fetching the user's
// account list a third way.
import { useAccountsQuery } from "@/lib/accounts/use-accounts"
import { useStatisticsFilters } from "@/lib/statistics/use-statistics-filters"
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, isPaymentMethod } from "@/lib/transactions/schemas"
import IntervalNav from "@/components/interval-nav/interval-nav"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const ANY_PAYMENT_METHOD = "any"

/**
 * The Statistics page's filter panel: account multi-select, category,
 * payment method, and the shared `IntervalNav`. Unlike Phase 7's
 * `FiltersBar` (whose filters are local `useState` in `TransactionsPage`),
 * every change here goes straight into the URL query string via
 * `useStatisticsFilters`, per the phase spec (SC-26) — this component
 * takes no props and reads/writes the URL itself.
 */
const StatisticsFilterPanel = () => {
  const { filters, updateFilters } = useStatisticsFilters()
  const { accounts } = useAccountsQuery()
  const [categoryDraft, setCategoryDraft] = useState(filters.category ?? "")
  // Tracks the last committed value this draft was synced from, so a
  // change coming from outside this input (a browser back/forward
  // navigation) can reset the draft without fighting the user's own
  // typing — adjusted during render rather than in an effect, per
  // React's own guidance for state derived from a prop.
  const [lastSyncedCategory, setLastSyncedCategory] = useState(filters.category)

  if (filters.category !== lastSyncedCategory) {
    setLastSyncedCategory(filters.category)
    setCategoryDraft(filters.category ?? "")
  }

  const handleCategoryBlur = () => {
    const trimmed = categoryDraft.trim()
    updateFilters({ category: trimmed.length > 0 ? trimmed : null })
  }

  const handleAccountToggle = (accountCode: string, checked: boolean) => {
    const nextAccountCodes = checked
      ? [...filters.accountCodes, accountCode]
      : filters.accountCodes.filter((code) => code !== accountCode)

    updateFilters({ accountCodes: nextAccountCodes })
  }

  const handlePaymentMethodChange = (value: string) => {
    if (value === ANY_PAYMENT_METHOD) {
      updateFilters({ paymentMethod: null })
      return
    }

    if (!isPaymentMethod(value)) return

    updateFilters({ paymentMethod: value })
  }

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-[3px] border border-border bg-card px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          Accounts{filters.accountCodes.length === 0 ? " (all)" : ""}
        </span>
        {accounts.map((account) => (
          <label key={account.code} className="flex items-center gap-1.5 text-sm">
            <Checkbox
              checked={filters.accountCodes.includes(account.code)}
              onCheckedChange={(checked) => handleAccountToggle(account.code, checked === true)}
            />
            {account.name} ({account.currency.toUpperCase()})
          </label>
        ))}
        {accounts.length === 0 ? <span className="text-sm text-muted-foreground">No accounts yet.</span> : null}
      </div>

      <Input
        value={categoryDraft}
        onChange={(event) => setCategoryDraft(event.target.value)}
        onBlur={handleCategoryBlur}
        onKeyDown={(event) => {
          if (event.key === "Enter") handleCategoryBlur()
        }}
        placeholder="Filter by category"
        aria-label="Filter by category"
        className="w-40"
      />

      <Select value={filters.paymentMethod ?? ANY_PAYMENT_METHOD} onValueChange={handlePaymentMethodChange}>
        <SelectTrigger aria-label="Filter by payment method" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY_PAYMENT_METHOD}>Any payment method</SelectItem>
          {PAYMENT_METHODS.map((method) => (
            <SelectItem key={method} value={method}>
              {PAYMENT_METHOD_LABELS[method]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <IntervalNav interval={filters.interval} onIntervalChange={(interval) => updateFilters({ interval })} />
    </div>
  )
}

export default StatisticsFilterPanel
