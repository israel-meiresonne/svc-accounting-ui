"use client"

import { createElement, type ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

/**
 * `staleTime` is 30s since this app's data changes by user action (a form
 * submit, an import) rather than a server push, so a short grace period
 * before refetching is safe. Queries retry once; mutations never retry,
 * since silently retrying a blind POST/PATCH risks duplicating a side
 * effect the first attempt may have already caused.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
})

type QueryProviderProps = {
  children: ReactNode
}

// Plain `createElement` rather than JSX: this file is `.ts`, not `.tsx`,
// per the phase spec's exact file listing, and `.ts` files can't parse a
// JSX `<Tag>` expression.
const QueryProvider = ({ children }: QueryProviderProps) => {
  return createElement(QueryClientProvider, { client: queryClient }, children)
}

export { QueryProvider }
