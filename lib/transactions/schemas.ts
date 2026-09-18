import { z } from "zod"

/**
 * `Transaction.payment_method`'s enum values (Phase 3's model, defined in
 * `svc-accounting`, not visible from this repo). Inferred from the Phase 1
 * mockup's own payment-method options (Cash / Credit card / Bank transfer
 * / Other) and rendered snake_case, matching this app's backend-enum
 * convention elsewhere. If Phase 3 lands with a different literal set,
 * this is the one place to correct.
 */
export const PAYMENT_METHODS = ["cash", "credit_card", "bank_transfer", "other"] as const

export type PaymentMethodValue = (typeof PAYMENT_METHODS)[number]

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodValue, string> = {
  cash: "Cash",
  credit_card: "Credit card",
  bank_transfer: "Bank transfer",
  other: "Other",
}

/**
 * Canonical type-predicate guard for `PaymentMethodValue`, shared by
 * every caller that only has a plain `string` (a `Select`'s
 * `onValueChange`, a `Transaction.paymentMethod` from the wire) and
 * needs to narrow it safely instead of an unsafe `as` cast.
 */
export function isPaymentMethod(value: string): value is PaymentMethodValue {
  return (PAYMENT_METHODS as readonly string[]).includes(value)
}

/**
 * Sentinel for "don't change this transaction's own value," since a
 * bulk-update `Select` needs a real selected value at all times but the
 * request should only include a key when the user actually chose to
 * change it. `toBulkUpdateAttributes` below strips it back out.
 */
export const NO_CHANGE = "no_change"

export const bulkUpdateSchema = z.object({
  category: z.string().optional(),
  paymentMethod: z.string().optional(),
  description: z.string().optional(),
})

export type BulkUpdateValues = z.infer<typeof bulkUpdateSchema>

/**
 * Wire shape `PATCH /api/v1/transactions/bulk` expects for `attributes`,
 * matching `Transactions::Bulk::Update::ALLOWED_ATTRIBUTES` exactly
 * (`category`, `payment_method`, `description` — never `amount`,
 * `currency`, `account_id`, or `counterparty_id`).
 */
export type BulkUpdateAttributes = {
  category?: string
  payment_method?: string
  description?: string
}

/**
 * Strips blank/unset fields from a values object before it becomes a
 * mutation payload, per this codebase's "one shared utility, not
 * per-call `if (value != null)` checks" convention (FS-50). A field left
 * blank in the bulk-update form means "leave every selected transaction's
 * own value alone," which only works if that key is absent from the
 * request entirely, not sent as `""`.
 */
function omitEmpty<T extends Record<string, string | undefined>>(values: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined && value !== "")
  ) as Partial<T>
}

export function toBulkUpdateAttributes(values: BulkUpdateValues): BulkUpdateAttributes {
  return omitEmpty({
    category: values.category,
    payment_method: values.paymentMethod === NO_CHANGE ? undefined : values.paymentMethod,
    description: values.description,
  })
}

export const moveSchema = z.object({
  destinationAccountCode: z.string().min(1, "Select a destination account"),
})

export type MoveValues = z.infer<typeof moveSchema>

export const reportSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  reportingCurrency: z.string().optional(),
})

export type ReportValues = z.infer<typeof reportSchema>
