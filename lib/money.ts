/**
 * Formats a decimal amount already computed by the backend
 * (`Currencies::Money#as_json`) for display. Does no arithmetic: `amount`
 * is only ever coerced to a `Number` for the formatter call.
 *
 * `currency` is expected lowercase everywhere else in the frontend, per the
 * discovery overview's currency-casing rule; it is uppercased only here, at
 * the formatting boundary, since that's the shape `Intl.NumberFormat` itself
 * documents.
 */
export function formatMoney(amount: string | number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(Number(amount))
}
