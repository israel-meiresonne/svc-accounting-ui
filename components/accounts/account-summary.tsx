import { formatMoney } from "@/lib/money"
import type { Money } from "@/lib/accounts/use-accounts"
import { Card, CardContent } from "@/components/ui/card"

type AccountSummaryProps = {
  summary: Money
}

/**
 * Always renders a real amount: the backend's `Accounts::SumAll` returns
 * a zero-amount `Money` rather than `null` when the user has no accounts
 * yet (see the phase spec), so this component never needs an
 * empty/loading branch of its own for that case.
 */
const AccountSummary = ({ summary }: AccountSummaryProps) => {
  return (
    <Card className="w-fit">
      <CardContent className="flex flex-col gap-1">
        <span className="text-xs tracking-wide text-muted-foreground uppercase">
          Total balance
        </span>
        <span className="font-heading text-2xl text-card-foreground">
          {formatMoney(summary.amount, summary.currency)}
        </span>
      </CardContent>
    </Card>
  )
}

export default AccountSummary
