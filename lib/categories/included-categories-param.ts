const INCLUDED_CATEGORIES_PARAM = "included_categories"

/**
 * The one place the category filter's URL encoding lives, shared by every
 * page that keeps it in the query string: category names comma-joined
 * under `included_categories`, an empty selection meaning the param is
 * absent altogether.
 */
export function parseIncludedCategories(searchParams: URLSearchParams): string[] {
  const param = searchParams.get(INCLUDED_CATEGORIES_PARAM)
  return param ? param.split(",").filter((category) => category.length > 0) : []
}

export function setIncludedCategories(searchParams: URLSearchParams, includedCategories: string[]): URLSearchParams {
  if (includedCategories.length > 0) {
    searchParams.set(INCLUDED_CATEGORIES_PARAM, includedCategories.join(","))
  } else {
    searchParams.delete(INCLUDED_CATEGORIES_PARAM)
  }

  return searchParams
}
