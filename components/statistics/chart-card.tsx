import type { ReactNode } from "react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

/**
 * Card chrome shared by every chart on the Statistics page (title, an
 * optional legend/headline stat/note, then the chart's own canvas area),
 * matching `mockups/statistics.html`'s `.chart-card` treatment. Colocated
 * here — used by all six chart components in this feature, not exported
 * beyond it — rather than duplicated in each one.
 *
 * Two named exports, no default, matching the local convention already
 * established for multi-part presentational files (see `components/ui/card.tsx`).
 *
 * Built on the shared `Card`/`CardContent` primitives (the same overrides
 * `account-card.tsx` already applies) rather than a hand-rolled `div`, so
 * this feature's card chrome doesn't drift from that one shared component.
 */
type ChartCardProps = {
  title: string
  legend?: ReactNode
  statNum?: ReactNode
  note?: ReactNode
  tall?: boolean
  children: ReactNode
}

const ChartCard = ({ title, legend, statNum, note, tall = false, children }: ChartCardProps) => {
  return (
    <Card className="rounded-[3px] border border-border transition-colors hover:border-border-bright">
      <CardContent className="flex flex-col gap-3">
        <h3 className="font-body text-sm uppercase tracking-wide text-card-foreground">{title}</h3>
        {legend ? <div className="flex flex-wrap gap-5 text-xs text-text-dim">{legend}</div> : null}
        {statNum ? <div className="font-heading text-2xl text-accent-bright">{statNum}</div> : null}
        {note ? <div className="text-xs text-text-dim">{note}</div> : null}
        <div className={cn("relative", tall ? "h-64" : "h-56")}>{children}</div>
      </CardContent>
    </Card>
  )
}

type LegendDotProps = {
  colorClassName: string
  children: ReactNode
}

const LegendDot = ({ colorClassName, children }: LegendDotProps) => (
  <span className="inline-flex items-center gap-1.5">
    <span className={cn("inline-block size-2.5 rounded-full", colorClassName)} />
    {children}
  </span>
)

export { ChartCard, LegendDot }
