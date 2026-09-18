"use client"

import { format } from "date-fns"

import { intervalToDateRange, shiftInterval, type Interval } from "@/lib/intervals"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

/**
 * The six interval kinds from the Phase 1 mockup's interval select,
 * shared by the Account, Transactions, and Statistics pages' interval
 * nav. No page-specific component existed yet when this phase needed
 * one, so it's built here as a generic, reusable piece rather than
 * inlined into `FiltersBar` — the same reasoning `components/data-table/`
 * already follows for the table itself.
 */
const INTERVAL_KIND_LABELS = {
  month: "Current month",
  week: "Current week",
  last7days: "Last 7 days",
  year: "Current year",
  trailingYear: "1 year",
  custom: "Custom interval",
} as const

type PeriodicIntervalKind = "month" | "week" | "last7days" | "year" | "trailingYear"

function formatIntervalLabel(interval: Interval, referenceDate: Date): string {
  const { from, to } = intervalToDateRange(interval, referenceDate)

  if (interval.kind === "month") return format(from, "MMMM yyyy")
  if (interval.kind === "year") return format(from, "yyyy")

  return `${format(from, "MMM d, yyyy")} – ${format(to, "MMM d, yyyy")}`
}

function isPeriodicIntervalKind(kind: string): kind is PeriodicIntervalKind {
  return kind === "month" || kind === "week" || kind === "last7days" || kind === "year" || kind === "trailingYear"
}

type IntervalNavProps = {
  interval: Interval
  onIntervalChange: (interval: Interval) => void
}

const IntervalNav = ({ interval, onIntervalChange }: IntervalNavProps) => {
  const referenceDate = new Date()
  const isCustom = interval.kind === "custom"

  const handleKindChange = (kind: string) => {
    if (kind === "custom") {
      const { from, to } = intervalToDateRange(interval, referenceDate)
      onIntervalChange({ kind: "custom", from, to })
      return
    }

    if (!isPeriodicIntervalKind(kind)) return

    onIntervalChange({ kind, offset: 0 })
  }

  const handlePrev = () => {
    onIntervalChange(shiftInterval(interval, "prev"))
  }

  const handleNext = () => {
    onIntervalChange(shiftInterval(interval, "next"))
  }

  const handleCustomFromChange = (date: Date | undefined) => {
    if (!date || interval.kind !== "custom") return

    onIntervalChange({ kind: "custom", from: date, to: interval.to })
  }

  const handleCustomToChange = (date: Date | undefined) => {
    if (!date || interval.kind !== "custom") return

    onIntervalChange({ kind: "custom", from: interval.from, to: date })
  }

  return (
    <div role="group" aria-label="Interval" className="flex items-center gap-2.5">
      <Select value={interval.kind} onValueChange={handleKindChange}>
        <SelectTrigger aria-label="Interval kind" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(INTERVAL_KIND_LABELS).map(([kind, label]) => (
            <SelectItem key={kind} value={kind}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button variant="outline" size="icon-sm" onClick={handlePrev} disabled={isCustom} aria-label="Previous interval">
        &lsaquo;
      </Button>

      {isCustom ? (
        <div className="flex items-center gap-1.5">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                {format(interval.from, "MMM d, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={interval.from} onSelect={handleCustomFromChange} />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground">&ndash;</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                {format(interval.to, "MMM d, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={interval.to} onSelect={handleCustomToChange} />
            </PopoverContent>
          </Popover>
        </div>
      ) : (
        <span className="min-w-[11ch] text-center text-sm text-card-foreground" data-testid="interval-label">
          {formatIntervalLabel(interval, referenceDate)}
        </span>
      )}

      <Button variant="outline" size="icon-sm" onClick={handleNext} disabled={isCustom} aria-label="Next interval">
        &rsaquo;
      </Button>
    </div>
  )
}

export default IntervalNav
