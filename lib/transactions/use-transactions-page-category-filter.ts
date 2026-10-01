"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { parseIncludedCategories, setIncludedCategories } from "@/lib/categories/included-categories-param"

/**
 * Reads and writes the Transactions page's category filter from the URL
 * query string (`?included_categories=...`) — the one field of this
 * page's filter state that is URL-persisted. Every other filter here
 * (`accountCodes`, `paymentMethod`) and the page's `interval` stay local
 * `useState` in `TransactionsPage`; only the category filter was asked to
 * survive navigation and refresh.
 */
export function useTransactionsPageCategoryFilter() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const includedCategories = parseIncludedCategories(searchParams)

  // `replace`, not `push`: narrowing the categories refines the current
  // view, it is not a page the back button should have to walk back out of.
  const updateIncludedCategories = (next: string[]) => {
    const params = setIncludedCategories(new URLSearchParams(searchParams.toString()), next)
    router.replace(`${pathname}?${params.toString()}`)
  }

  return { includedCategories, updateIncludedCategories }
}
