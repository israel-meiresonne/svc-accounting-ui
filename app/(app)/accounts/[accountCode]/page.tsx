"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { endOfDay, format, startOfDay } from "date-fns"

import { useAccountPageInterval } from "@/lib/accounts/use-account-page-interval"
import { useAccountsQuery } from "@/lib/accounts/use-accounts"
import { intervalToDateRange } from "@/lib/intervals"
import {
  SortableColumn,
  useTransactionStats,
  useTransactions,
  type Transaction,
} from "@/lib/transactions/queries"
import AccountSwitcher from "@/components/accounts/account-switcher"
import IntervalNav from "@/components/interval-nav/interval-nav"
import AccountTransactionsTable from "@/components/transactions/account-transactions-table"
import StatsTiles from "@/components/transactions/stats-tiles"
import TransactionFormModal from "@/components/transactions/transaction-form-modal"
import { Button } from "@/components/ui/button"

/**
 * The account's transactions are read through Phase 7's shared
 * `useTransactions` hook, always newest-first. Sorting and server-side
 * paging are the cross-account Transactions page's job; this page asks
 * for one generous page of the selected interval and lets the shared
 * table page through it client-side, which is why there is no sorting or
 * pagination state here.
 */
const SORT = { column: SortableColumn.OccurredAt, order: "desc" } as const
const PAGE = { pageIndex: 0, pageSize: 100 }

const AccountPage = () => {
  const params = useParams<{ accountCode: string }>()
  const accountCode = params.accountCode

  const [editedTransaction, setEditedTransaction] = useState<Transaction | undefined>(undefined)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const { interval, updateInterval } = useAccountPageInterval()
  const { from, to } = intervalToDateRange(interval, new Date())

  const { accounts } = useAccountsQuery()
  const account = accounts.find((candidate) => candidate.code === accountCode)

  const { transactions, isLoading } = useTransactions(
    {
      from: format(from, "yyyy-MM-dd"),
      to: format(to, "yyyy-MM-dd"),
      accountCodes: [accountCode],
      category: "",
      paymentMethod: "",
    },
    SORT,
    PAGE
  )

  // `GET /api/v1/transactions/stats` compares `occurred_at` against these
  // two values as-is, with no day-boundary expansion of its own (unlike
  // the list endpoint), so they're sent as full instants spanning the
  // whole interval — a bare `yyyy-MM-dd` `to` would drop everything that
  // happened later on that last day.
  const { stats } = useTransactionStats(
    accountCode,
    startOfDay(from).toISOString(),
    endOfDay(to).toISOString()
  )

  const handleNewTransaction = () => {
    setEditedTransaction(undefined)
    setIsFormOpen(true)
  }

  const handleRowClick = (transaction: Transaction) => {
    setEditedTransaction(transaction)
    setIsFormOpen(true)
  }

  return (
    <div className="flex flex-col gap-5 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl">{account ? account.name : "Account"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            One account, one interval — every transaction, income, and expense within it.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AccountSwitcher currentAccountCode={accountCode} />
          <Button type="button" className="uppercase" onClick={handleNewTransaction}>
            $ New transaction
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3 rounded-[3px] border border-border bg-card px-4 py-3">
        <IntervalNav interval={interval} onIntervalChange={updateInterval} />
      </div>

      <StatsTiles stats={stats} />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading transactions...</p>
      ) : (
        <AccountTransactionsTable transactions={transactions} onRowClick={handleRowClick} />
      )}

      <TransactionFormModal
        open={isFormOpen}
        accountCode={accountCode}
        transaction={editedTransaction}
        onOpenChange={setIsFormOpen}
      />
    </div>
  )
}

export default AccountPage
