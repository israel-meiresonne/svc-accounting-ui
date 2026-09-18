import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js"

// Chart.js 4 registers nothing by default. This is the one place every
// chart component on the Statistics page registers what it needs, and
// every one of them imports this file for that side effect before
// rendering its own `<Line>`/`<Bar>` (`react-chartjs-2`).
ChartJS.register(
  LineElement,
  BarElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler
)

/**
 * Reads a CSS custom property's live value off `:root`/`.dark`
 * (`app/globals.css`, ported from `mockups/shared.css`) — colors always
 * come from the design system's tokens, never a hand-copied hex value,
 * matching the mockup's own `Ledgr.cssVar` helper.
 *
 * `fallback` only fires outside a real browser paint (SSR, or a test
 * environment with no stylesheet loaded) — it repeats that same token's
 * already-shipped value, not a new color choice.
 */
function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback

  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value.length > 0 ? value : fallback
}

/**
 * `--chart-1`..`--chart-5` are the tokens `app/globals.css` already
 * defines specifically for chart series (ported 1:1 from the matrix-astro
 * palette's solid colors). The base `--accent`/`--border` tokens are used
 * for the translucent fill/grid tones only.
 */
export const ChartColor = {
  current: cssVar("--chart-1", "#3ddc6e"),
  currentBright: cssVar("--chart-2", "#7dffab"),
  previous: cssVar("--chart-5", "#6f8f7a"),
  previousSoft: cssVar("--text-dim-soft", "rgba(111, 143, 122, 0.55)"),
  forecast: cssVar("--chart-3", "#ffb454"),
  danger: cssVar("--chart-4", "#ff6b6b"),
  dangerSoft: cssVar("--danger-soft", "rgba(255, 107, 107, 0.12)"),
  accentSoft: cssVar("--accent-soft", "rgba(61, 220, 110, 0.12)"),
  border: cssVar("--border", "#1c3524"),
}

ChartJS.defaults.font.family = cssVar("--font-body", "'IBM Plex Mono', 'Courier New', monospace")
ChartJS.defaults.color = cssVar("--text-dim", "#6f8f7a")

ChartJS.defaults.plugins.tooltip.backgroundColor = cssVar("--popover", "#0d140f")
ChartJS.defaults.plugins.tooltip.titleColor = cssVar("--card-foreground", "#e6f7ec")
ChartJS.defaults.plugins.tooltip.bodyColor = cssVar("--foreground", "#b9d6c2")
ChartJS.defaults.plugins.tooltip.borderColor = cssVar("--border-bright", "#2f6b41")
ChartJS.defaults.plugins.tooltip.borderWidth = 1
ChartJS.defaults.plugins.tooltip.padding = 10
ChartJS.defaults.plugins.tooltip.cornerRadius = 2
