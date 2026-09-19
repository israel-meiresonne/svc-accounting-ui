import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import type { Interval } from "@/lib/intervals"
import IntervalNav from "@/components/interval-nav/interval-nav"

const CUSTOM_INTERVAL: Interval = {
  kind: "custom",
  from: new Date(2026, 0, 1),
  to: new Date(2026, 0, 31),
}

function arrows() {
  return {
    previous: screen.getByRole("button", { name: /previous interval/i }),
    next: screen.getByRole("button", { name: /next interval/i }),
  }
}

describe("<IntervalNav />", () => {
  it("disables both shift arrows for a custom interval, matching shiftInterval's no-op for that kind", () => {
    render(<IntervalNav interval={CUSTOM_INTERVAL} onIntervalChange={jest.fn()} />)

    expect(arrows().previous).toBeDisabled()
    expect(arrows().next).toBeDisabled()
  })

  it.each(["month", "week", "last7days", "year", "trailingYear"] as const)(
    "leaves both shift arrows enabled for the %s interval",
    (kind) => {
      render(<IntervalNav interval={{ kind, offset: 0 }} onIntervalChange={jest.fn()} />)

      expect(arrows().previous).not.toBeDisabled()
      expect(arrows().next).not.toBeDisabled()
    }
  )

  it("shifts the interval by one period in each direction", async () => {
    const handleIntervalChange = jest.fn()
    const user = userEvent.setup()

    render(<IntervalNav interval={{ kind: "month", offset: 0 }} onIntervalChange={handleIntervalChange} />)

    await user.click(arrows().next)
    expect(handleIntervalChange).toHaveBeenLastCalledWith({ kind: "month", offset: 1 })

    await user.click(arrows().previous)
    expect(handleIntervalChange).toHaveBeenLastCalledWith({ kind: "month", offset: -1 })
  })
})
