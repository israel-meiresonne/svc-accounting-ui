"use client"

import { useState } from "react"

import { useAccountsQuery } from "@/lib/accounts/use-accounts"
import { useAuth } from "@/lib/auth/auth-context"
import AccountCard from "@/components/accounts/account-card"
import AccountCurrencySetting from "@/components/accounts/account-currency-setting"
import AccountFormDialog from "@/components/accounts/account-form-dialog"
import AccountSummary from "@/components/accounts/account-summary"
import CsvImportDialog from "@/components/accounts/csv-import-dialog"
import { Button } from "@/components/ui/button"

/**
 * The app's home page: the accounts list with balances, the entry points
 * into account CRUD and CSV import, and the user's own main-currency
 * setting. Everything here is client-side (auth + TanStack Query), which
 * is why this route file is the interactive component itself rather than
 * a thin server shell around one — there's no server-renderable content
 * above the fold that doesn't already depend on `current_user`.
 */
const AccountsPage = () => {
  const { accounts, summary, isLoading } = useAccountsQuery()
  const { user } = useAuth()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg">Accounts</h1>
          <p className="text-sm text-muted-foreground">
            Home — every account you own, at a glance.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            className="uppercase"
            onClick={() => setIsImportOpen(true)}
          >
            &gt; Upload CSV
          </Button>
          <Button type="button" className="uppercase" onClick={() => setIsCreateOpen(true)}>
            $ New account
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-4">
        <AccountSummary summary={summary} />
        {user ? <AccountCurrencySetting currentCurrency={user.currency} /> : null}
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-base">Your accounts</h2>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading accounts...</p>
        ) : accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No accounts yet — create one to get started.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => (
              <AccountCard key={account.code} account={account} />
            ))}
          </div>
        )}
      </section>

      <AccountFormDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      <CsvImportDialog open={isImportOpen} onOpenChange={setIsImportOpen} />
    </div>
  )
}

export default AccountsPage
