"use client"

// Phase 5 (Accounts page) owns this hook; reused here the same way
// Phase 7's `FiltersBar` already does, rather than fetching the user's
// account list a third way.
import { useAccountsQuery } from "@/lib/accounts/use-accounts"
import { useCategoriesQuery } from "@/lib/categories/use-categories"
import { useStatisticsFilters } from "@/lib/statistics/use-statistics-filters"
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, isPaymentMethod } from "@/lib/transactions/schemas"
import CategoryFilter from "@/components/category-filter/category-filter"
import IntervalNav from "@/components/interval-nav/interval-nav"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const ANY_PAYMENT_METHOD = "any"

/**
 * The Statistics page's filter panel: account multi-select, category
 * filter, payment method, and the shared `IntervalNav`. Unlike Phase 7's
 * `FiltersBar` (whose filters are local `useState` in `TransactionsPage`),
 * every change here goes straight into the URL query string via
 * `useStatisticsFilters`, per the phase spec (SC-26) — this component
 * takes no props and reads/writes the URL itself.
 *
 * The category filter has no draft/commit step: every toggle calls
 * `updateFilters` straight away, like the account checkboxes, and
 * `filters.includedCategories` is the displayed value on every render.
 */
const StatisticsFilterPanel = () => {
  const { filters, updateFilters } = useStatisticsFilters()
  const { accounts } = useAccountsQuery()
  const { categories } = useCategoriesQuery()

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

      <CategoryFilter
        categories={categories}
        includedCategories={filters.includedCategories}
        onIncludedCategoriesChange={(next) => updateFilters({ includedCategories: next })}
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
