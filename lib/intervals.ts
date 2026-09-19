import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subYears,
} from "date-fns"

/**
 * The six interval kinds the interval nav (Account, Transactions, and
 * Statistics pages) offers, per the Phase 1 mockup's interval select.
 *
 * `month`, `week`, `year` are calendar-aligned. `last7days` and
 * `trailingYear` are rolling windows anchored on the reference date instead
 * of a calendar boundary. `custom` carries its own explicit `from`/`to` and
 * never shifts: `shiftInterval` is a no-op for it, which is the concrete
 * implementation of the "arrows disabled on custom interval" decision.
 */
const PERIODIC_INTERVAL_KINDS = ["month", "week", "last7days", "year", "trailingYear"] as const

type PeriodicIntervalKind = (typeof PERIODIC_INTERVAL_KINDS)[number]

type PeriodicInterval = {
  kind: PeriodicIntervalKind
  /** Number of periods away from the period containing the reference date; 0 is the current one. */
  offset: number
}

type CustomInterval = {
  kind: "custom"
  from: Date
  to: Date
}

export type Interval = PeriodicInterval | CustomInterval

type DateRange = {
  from: Date
  to: Date
}

const WEEK_OPTIONS = { weekStartsOn: 1 as const }

function periodicRange(interval: PeriodicInterval, referenceDate: Date): DateRange {
  switch (interval.kind) {
    case "month": {
      const anchor = addMonths(referenceDate, interval.offset)
      return { from: startOfMonth(anchor), to: endOfMonth(anchor) }
    }
    case "week": {
      const anchor = addWeeks(referenceDate, interval.offset)
      return {
        from: startOfWeek(anchor, WEEK_OPTIONS),
        to: endOfWeek(anchor, WEEK_OPTIONS),
      }
    }
    case "year": {
      const anchor = addYears(referenceDate, interval.offset)
      return { from: startOfYear(anchor), to: endOfYear(anchor) }
    }
    case "last7days": {
      const to = addDays(referenceDate, interval.offset * 7)
      return { from: subDays(to, 6), to }
    }
    case "trailingYear": {
      const to = addYears(referenceDate, interval.offset)
      return { from: subYears(to, 1), to }
    }
  }
}

/**
 * Resolves an `Interval` into a concrete `{ from, to }` date range.
 *
 * `referenceDate` anchors every periodic kind ("today", in practice); it is
 * ignored for `kind: 'custom'`, which already carries its own explicit range.
 */
export function intervalToDateRange(interval: Interval, referenceDate: Date): DateRange {
  if (interval.kind === "custom") {
    return { from: interval.from, to: interval.to }
  }

  return periodicRange(interval, referenceDate)
}

/**
 * Shifts an interval by its own length in the given direction, the behavior
 * behind the interval nav's left/right arrows. Returns the same `Interval`
 * value, unchanged, when `interval.kind === 'custom'` — those arrows render
 * disabled, and this is what makes that disabling correct rather than just
 * cosmetic.
 */
export function shiftInterval(interval: Interval, direction: "prev" | "next"): Interval {
  if (interval.kind === "custom") {
    return interval
  }

  const step = direction === "next" ? 1 : -1
  return { ...interval, offset: interval.offset + step }
}

/**
 * Returns the interval immediately preceding `interval`, of the same
 * length, for comparison purposes (e.g. a chart's "previous interval"
 * series or axis label). Unlike `shiftInterval`, this always computes a
 * real previous interval, including for `kind: 'custom'`, since disabling
 * the nav arrows for a custom interval is a UI interaction decision, not a
 * statement that a custom interval has no "previous interval of the same
 * length" for comparison purposes.
 */
const DEFAULT_INTERVAL: PeriodicInterval = { kind: "month", offset: 0 }

function isPeriodicIntervalKind(value: string): value is PeriodicIntervalKind {
  return (PERIODIC_INTERVAL_KINDS as readonly string[]).includes(value)
}

/**
 * Reads an `Interval` back out of a URL query string
 * (`?interval=week&offset=-2`, or `?interval=custom&from=...&to=...`).
 * Every page that keeps its selected interval in the URL — the Account
 * page, the Statistics page — parses it through this one function, so a
 * URL copied from one page is understood by the other.
 *
 * Anything unrecognized (an unknown kind, a `custom` with no explicit
 * range, a non-numeric offset) falls back to the current month rather
 * than throwing on a hand-edited URL.
 */
export function parseIntervalParams(searchParams: URLSearchParams): Interval {
  const kind = searchParams.get("interval")

  if (kind === "custom") {
    const from = searchParams.get("from")
    const to = searchParams.get("to")

    return from && to ? { kind: "custom", from: parseISO(from), to: parseISO(to) } : DEFAULT_INTERVAL
  }

  const parsedOffset = Number(searchParams.get("offset") ?? "0")
  const offset = Number.isFinite(parsedOffset) ? parsedOffset : 0

  return kind !== null && isPeriodicIntervalKind(kind) ? { kind, offset } : DEFAULT_INTERVAL
}

/**
 * The inverse of `parseIntervalParams`: the interval's own query params,
 * and nothing else, so a caller with other params of its own can merge
 * these into them. A zero offset is omitted, since it's the default a
 * missing `offset` already parses back to.
 */
export function intervalToSearchParams(interval: Interval): URLSearchParams {
  const params = new URLSearchParams()
  params.set("interval", interval.kind)

  if (interval.kind === "custom") {
    params.set("from", format(interval.from, "yyyy-MM-dd"))
    params.set("to", format(interval.to, "yyyy-MM-dd"))
  } else if (interval.offset !== 0) {
    params.set("offset", String(interval.offset))
  }

  return params
}

export function previousInterval(interval: Interval): Interval {
  if (interval.kind !== "custom") {
    return { ...interval, offset: interval.offset - 1 }
  }

  const lengthInDays = differenceInCalendarDays(interval.to, interval.from) + 1
  const to = subDays(interval.from, 1)
  const from = subDays(to, lengthInDays - 1)
  return { kind: "custom", from, to }
}
