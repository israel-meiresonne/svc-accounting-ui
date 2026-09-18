"use client"

import { toast } from "sonner"

import { CURRENCIES } from "@/lib/accounts/schemas"
import { useUpdateCurrency } from "@/lib/accounts/use-update-currency"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type AccountCurrencySettingProps = {
  currentCurrency: string
}

/**
 * `useUpdateCurrency` itself writes the response's returned user back
 * into `AuthProvider` (see `lib/accounts/use-update-currency.ts`), so this
 * component only needs to trigger the mutation — `currentCurrency` always
 * reflects `AuthProvider`'s own `user.currency` from the caller, and
 * updates the moment that mutation resolves.
 */
const AccountCurrencySetting = ({ currentCurrency }: AccountCurrencySettingProps) => {
  const updateCurrency = useUpdateCurrency()

  const handleValueChange = (currency: string) => {
    updateCurrency.mutate(currency, {
      onError: (error) => {
        toast.error(
          error instanceof Error ? error.message : "Couldn't update your main currency."
        )
      },
    })
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs tracking-wide text-muted-foreground uppercase">
        Main currency
      </span>
      <Select
        value={currentCurrency}
        onValueChange={handleValueChange}
        disabled={updateCurrency.isPending}
      >
        <SelectTrigger aria-label="Main currency" className="w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CURRENCIES.map((currency) => (
            <SelectItem key={currency} value={currency}>
              {currency.toUpperCase()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default AccountCurrencySetting
