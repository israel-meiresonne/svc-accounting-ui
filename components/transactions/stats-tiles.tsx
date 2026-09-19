"use client"

import { formatMoney } from "@/lib/money"
import { cn } from "@/lib/utils"
import type { TransactionStats } from "@/lib/transactions/queries"
import { Card, CardContent } from "@/components/ui/card"

type StatsTilesProps = {
  stats: TransactionStats
}

/**
 * The account page's three read-only totals for the selected interval.
 * Every amount is already computed by the backend (`Currencies::Money`)
 * and only formatted here — no arithmetic happens in this component, so
 * no decimal string is ever coerced into a JS `number`.
 */
const StatsTiles = ({ stats }: StatsTilesProps) => {
  const tiles = [
    { label: "Total income", money: stats.totalIncome, className: "text-accent-bright" },
    { label: "Total expenses", money: stats.totalExpenses, className: "text-danger" },
    { label: "Net balance", money: stats.netBalance, className: "text-card-foreground" },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {tiles.map((tile) => (
        <Card key={tile.label} className="border border-border">
          <CardContent className="flex flex-col gap-1.5">
            <span className="text-xs tracking-wide text-muted-foreground uppercase">
              {tile.label}
            </span>
            <span className={cn("font-heading text-xl", tile.className)}>
              {formatMoney(tile.money.amount, tile.money.currency)}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default StatsTiles
