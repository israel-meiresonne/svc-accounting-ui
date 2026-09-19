"use client"

import { useAccountsQuery } from "@/lib/accounts/use-accounts"
import { useAccountPageInterval } from "@/lib/accounts/use-account-page-interval"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type AccountSwitcherProps = {
  currentAccountCode: string
}

/**
 * Moves between the user's accounts without losing what the page is
 * currently showing: `goToAccount` carries the whole query string over
 * verbatim, so the interval the user picked survives the switch instead of
 * resetting to the default. The navigation itself lives in
 * `useAccountPageInterval`, this page's single owner of the URL state, so
 * this component never calls `useRouter`/`useSearchParams` of its own.
 */
const AccountSwitcher = ({ currentAccountCode }: AccountSwitcherProps) => {
  const { accounts } = useAccountsQuery()
  const { goToAccount } = useAccountPageInterval()

  const handleAccountChange = (accountCode: string) => {
    if (accountCode === currentAccountCode) return

    goToAccount(accountCode)
  }

  return (
    <Select value={currentAccountCode} onValueChange={handleAccountChange}>
      <SelectTrigger aria-label="Account" className="w-56">
        <SelectValue placeholder="Select an account" />
      </SelectTrigger>
      <SelectContent>
        {accounts.map((account) => (
          <SelectItem key={account.code} value={account.code}>
            {`${account.name} (${account.currency.toUpperCase()})`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export default AccountSwitcher
