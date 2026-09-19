"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { intervalToSearchParams, parseIntervalParams, type Interval } from "@/lib/intervals"

/**
 * Reads and writes the Account page's selected interval, entirely from the
 * URL query string (`?interval=week&offset=-2`, or `?interval=custom
 * &from=...&to=...`), never local component state — this is the one place
 * `useSearchParams`/`useRouter`/`usePathname` get called for this page, per
 * `code-style-frontend-react-next`'s "wrap URL state in a small custom
 * hook" rule, mirroring `useStatisticsFilters`. The parsing and
 * serializing themselves stay in `lib/intervals`, shared with every other
 * page that keeps an interval in the URL; this hook only binds them to the
 * router.
 *
 * The `accountCode` in the path is deliberately *not* read here: it is a
 * route param the page takes from `useParams`, not query state. What this
 * hook does own on that front is `goToAccount`, the account switcher's
 * "same view, other account" navigation — the whole current query string
 * is carried over verbatim, so the interval the user picked survives the
 * switch instead of resetting to the default, and no caller has to know
 * which params the page happens to keep there.
 */
export function useAccountPageInterval() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const interval = parseIntervalParams(new URLSearchParams(searchParams.toString()))

  // `replace`, not `push`: stepping through intervals is refining one view,
  // not a trail of pages the back button should have to walk back out of.
  const updateInterval = (nextInterval: Interval) => {
    router.replace(`${pathname}?${intervalToSearchParams(nextInterval).toString()}`)
  }

  const goToAccount = (accountCode: string) => {
    const query = searchParams.toString()
    router.push(`/accounts/${accountCode}${query === "" ? "" : `?${query}`}`)
  }

  return { interval, updateInterval, goToAccount }
}
