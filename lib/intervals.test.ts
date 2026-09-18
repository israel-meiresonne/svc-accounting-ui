import { intervalToDateRange, previousInterval, shiftInterval, type Interval } from "@/lib/intervals"

// August 15, 2026 (a Saturday), used as a fixed anchor so every assertion
// below is deterministic regardless of when the suite actually runs.
const REFERENCE_DATE = new Date(2026, 7, 15)

function dateString(date: Date): string {
  return date.toDateString()
}

describe("intervalToDateRange", () => {
  it("resolves the current calendar month", () => {
    const interval: Interval = { kind: "month", offset: 0 }
    const { from, to } = intervalToDateRange(interval, REFERENCE_DATE)

    expect(dateString(from)).toBe(dateString(new Date(2026, 7, 1)))
    expect(dateString(to)).toBe(dateString(new Date(2026, 7, 31)))
  })

  it("resolves a month interval shifted backwards", () => {
    const interval: Interval = { kind: "month", offset: -1 }
    const { from, to } = intervalToDateRange(interval, REFERENCE_DATE)

    expect(dateString(from)).toBe(dateString(new Date(2026, 6, 1)))
    expect(dateString(to)).toBe(dateString(new Date(2026, 6, 31)))
  })

  it("resolves the current calendar week, starting on Monday", () => {
    const interval: Interval = { kind: "week", offset: 0 }
    const { from, to } = intervalToDateRange(interval, REFERENCE_DATE)

    expect(dateString(from)).toBe(dateString(new Date(2026, 7, 10)))
    expect(dateString(to)).toBe(dateString(new Date(2026, 7, 16)))
  })

  it("resolves the current calendar year", () => {
    const interval: Interval = { kind: "year", offset: 0 }
    const { from, to } = intervalToDateRange(interval, REFERENCE_DATE)

    expect(dateString(from)).toBe(dateString(new Date(2026, 0, 1)))
    expect(dateString(to)).toBe(dateString(new Date(2026, 11, 31)))
  })

  it("resolves a rolling 7-day window ending on the reference date", () => {
    const interval: Interval = { kind: "last7days", offset: 0 }
    const { from, to } = intervalToDateRange(interval, REFERENCE_DATE)

    expect(dateString(from)).toBe(dateString(new Date(2026, 7, 9)))
    expect(dateString(to)).toBe(dateString(REFERENCE_DATE))
  })

  it("resolves a rolling 1-year window since the same day last year", () => {
    const interval: Interval = { kind: "trailingYear", offset: 0 }
    const { from, to } = intervalToDateRange(interval, REFERENCE_DATE)

    expect(dateString(from)).toBe(dateString(new Date(2025, 7, 15)))
    expect(dateString(to)).toBe(dateString(REFERENCE_DATE))
  })

  it("resolves a custom interval to its own from/to, ignoring the reference date", () => {
    const interval: Interval = {
      kind: "custom",
      from: new Date(2026, 0, 1),
      to: new Date(2026, 0, 31),
    }
    const { from, to } = intervalToDateRange(interval, REFERENCE_DATE)

    expect(dateString(from)).toBe(dateString(new Date(2026, 0, 1)))
    expect(dateString(to)).toBe(dateString(new Date(2026, 0, 31)))
  })
})

describe("shiftInterval", () => {
  it("moves a periodic interval forward by its own length", () => {
    const interval: Interval = { kind: "month", offset: 0 }

    expect(shiftInterval(interval, "next")).toEqual({ kind: "month", offset: 1 })
  })

  it("moves a periodic interval backward by its own length", () => {
    const interval: Interval = { kind: "month", offset: 0 }

    expect(shiftInterval(interval, "prev")).toEqual({ kind: "month", offset: -1 })
  })

  it("returns the same custom interval unchanged, regardless of direction", () => {
    const interval: Interval = {
      kind: "custom",
      from: new Date(2026, 0, 1),
      to: new Date(2026, 0, 31),
    }

    expect(shiftInterval(interval, "next")).toBe(interval)
    expect(shiftInterval(interval, "prev")).toBe(interval)
  })
})

describe("previousInterval", () => {
  it("returns the immediately preceding period for a periodic interval", () => {
    const interval: Interval = { kind: "month", offset: 0 }

    expect(previousInterval(interval)).toEqual({ kind: "month", offset: -1 })
  })

  it("computes a same-length preceding range for a custom interval", () => {
    const interval: Interval = {
      kind: "custom",
      from: new Date(2026, 0, 10),
      to: new Date(2026, 0, 20),
    }

    const previous = previousInterval(interval) as { kind: "custom"; from: Date; to: Date }

    expect(previous.kind).toBe("custom")
    expect(dateString(previous.to)).toBe(dateString(new Date(2026, 0, 9)))
    expect(dateString(previous.from)).toBe(dateString(new Date(2025, 11, 30)))
  })
})
