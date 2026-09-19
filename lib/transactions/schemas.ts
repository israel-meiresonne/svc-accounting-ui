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
 * Display label for a payment method that only exists as a plain
 * `string` (a `Transaction.paymentMethod` off the wire). Lives next to
 * `PAYMENT_METHOD_LABELS` rather than being redefined by each table's
 * column definitions — Phase 7's cross-account columns and Phase 6's
 * single-account columns both need exactly this.
 */
export function paymentMethodLabel(value: string): string {
  if (!isPaymentMethod(value)) return value

  return PAYMENT_METHOD_LABELS[value]
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

// ---- Single-transaction create/edit form ---------------------------------

/**
 * The two `User.type` values a counterparty can be created as from the
 * transaction form. `user` is deliberately absent: a real app user is
 * only ever *found* through the counterparty search, never created
 * inline here.
 */
export const COUNTERPARTY_TYPES = ["contact", "company"] as const

export type CounterpartyType = (typeof COUNTERPARTY_TYPES)[number]

/**
 * The brand-new counterparty branch of `CounterpartyPicker`. Name fields
 * only: `User.image` has no upload path anywhere in this discovery, so an
 * inline-created counterparty's image is always `null`, and `email` is
 * never asked for here since the picker's whole purpose is naming someone
 * who isn't in the system yet.
 */
export const counterpartyOptionsSchema = z
  .object({
    type: z.enum(COUNTERPARTY_TYPES),
    firstName: z.string(),
    lastName: z.string(),
    companyName: z.string(),
  })
  .refine(
    (options) =>
      options.type === "company"
        ? options.companyName.trim() !== ""
        : options.firstName.trim() !== "",
    { message: "A name is required for a new counterparty" }
  )

export type CounterpartyOptions = z.infer<typeof counterpartyOptionsSchema>

/**
 * One counterparty field, two shapes: an existing counterparty picked
 * from the search results (`counterpartyCode`), or a brand-new one
 * described inline (`counterpartyOptions`). The counterparty itself is
 * required — per Phase 3's model validation — which is what the refine
 * below enforces: the two keys are never both absent.
 */
export const counterpartyValueSchema = z
  .object({
    counterpartyCode: z.string().optional(),
    counterpartyOptions: counterpartyOptionsSchema.optional(),
  })
  .refine(
    (value) => value.counterpartyCode !== undefined || value.counterpartyOptions !== undefined,
    { message: "Pick a counterparty, or create a new one" }
  )

export type CounterpartyValue = z.infer<typeof counterpartyValueSchema>

/**
 * `TransactionForm`'s field contract, shared by create and edit mode.
 *
 * There is deliberately no `currency` field: the backend reads a
 * transaction's currency from its account and never from request params,
 * so a currency the form could submit is a currency that could disagree
 * with the account's. It renders as a disabled, display-only field
 * instead.
 *
 * `amount` stays a string all the way to the wire (the backend's
 * `decimal(20,4)` column), never a JS `number` — the same precision rule
 * `TransactionDto.amount` already follows in the other direction.
 */
export const transactionSchema = z.object({
  occurredAt: z.string().min(1, "Date and time are required"),
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((amount) => Number.isFinite(Number(amount)), { message: "Amount must be a number" })
    .refine((amount) => Number(amount) !== 0, { message: "Amount can't be zero" }),
  category: z.string().min(1, "Category is required"),
  description: z.string(),
  paymentMethod: z.enum(PAYMENT_METHODS),
  counterparty: counterpartyValueSchema,
})

export type TransactionValues = z.infer<typeof transactionSchema>

type CounterpartyOptionsPayload = {
  type: CounterpartyType
  first_name: string | null
  last_name: string | null
  company_name: string | null
}

/**
 * Request body for `POST /api/v1/transactions` and
 * `PATCH /api/v1/transactions/:code`, matching the phase spec's documented
 * contract exactly — snake_case, no `currency` key, and exactly one of
 * `counterparty_code`/`counterparty_options`.
 */
export type TransactionPayload = {
  account_code: string
  amount: string
  category: string
  description: string
  payment_method: PaymentMethodValue
  occurred_at: string
  counterparty_code?: string
  counterparty_options?: CounterpartyOptionsPayload
}

function toCounterpartyOptionsPayload(options: CounterpartyOptions): CounterpartyOptionsPayload {
  const isCompany = options.type === "company"

  return {
    type: options.type,
    first_name: isCompany ? null : options.firstName,
    last_name: isCompany ? null : options.lastName,
    company_name: isCompany ? options.companyName : null,
  }
}

export function toTransactionPayload(
  accountCode: string,
  values: TransactionValues
): TransactionPayload {
  const { counterpartyCode, counterpartyOptions } = values.counterparty

  return {
    account_code: accountCode,
    amount: values.amount,
    category: values.category,
    description: values.description,
    payment_method: values.paymentMethod,
    occurred_at: values.occurredAt,
    ...(counterpartyCode === undefined ? {} : { counterparty_code: counterpartyCode }),
    ...(counterpartyOptions === undefined
      ? {}
      : { counterparty_options: toCounterpartyOptionsPayload(counterpartyOptions) }),
  }
}
