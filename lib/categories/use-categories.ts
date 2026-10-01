"use client"

import { useQuery } from "@tanstack/react-query"

import { apiClient } from "@/lib/api-client"

type CategoriesResponseDto = {
  categories: string[]
}

const CATEGORIES_QUERY_KEY = "categories"
const EMPTY_CATEGORIES: string[] = []

/**
 * `GET /api/v1/transactions/categories` — every distinct category the
 * current user has ever used, sorted alphabetically by the backend.
 * Shared by every page that filters transactions by category
 * (`CategoryFilter`'s data source), so this hook lives outside any one
 * page's directory.
 */
export function useCategoriesQuery() {
  const query = useQuery({
    queryKey: [CATEGORIES_QUERY_KEY],
    queryFn: async () => {
      const response = await apiClient.get<CategoriesResponseDto>("/transactions/categories")
      return response.data.categories
    },
  })

  return {
    categories: query.data ?? EMPTY_CATEGORIES,
    isLoading: query.isLoading,
    isError: query.isError,
  }
}
