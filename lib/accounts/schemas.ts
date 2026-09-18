import { z } from "zod"

/**
 * Duplicated from `CURRENCIES` in `lib/auth/schemas.ts` rather than
 * imported from it: that module belongs to the auth feature, and this one
 * to accounts, so importing across the two would cross a feature
 * boundary for a three-item literal that isn't worth promoting to a new
 * shared module on its own (per `code-style-frontend-react-next`'s
 * project-structure guidance on cross-feature imports).
 */
export const CURRENCIES = ["usd", "eur", "gbp"] as const

/**
 * Which of the two opening-balance entry modes `AccountFormDialog`'s
 * create-mode radio is set to. Only meaningful when `mode` is `"create"`;
 * ignored entirely in `"edit"` mode.
 */
export const BalanceMode = {
  Initial: "initial",
  Current: "current",
} as const

export type BalanceMode = (typeof BalanceMode)[keyof typeof BalanceMode]

/**
 * Which of `AccountFormDialog`'s two use cases the form is currently
 * rendering. Kept as a field on the schema itself, rather than as two
 * separate schemas, so `useForm`'s generic type argument stays the same
 * single type regardless of which mode the dialog is in — switching modes
 * only ever changes which fields `superRefine` requires, never the shape
 * `react-hook-form` is wired up against.
 */
export const AccountFormMode = {
  Create: "create",
  Edit: "edit",
} as const

export type AccountFormMode = (typeof AccountFormMode)[keyof typeof AccountFormMode]

export const accountFormSchema = z
  .object({
    mode: z.enum([AccountFormMode.Create, AccountFormMode.Edit]),
    name: z.string().min(1, "Account name is required"),
    currency: z.enum(CURRENCIES),
    balanceMode: z.enum([BalanceMode.Initial, BalanceMode.Current]),
    initialBalance: z.string(),
    currentBalance: z.string(),
  })
  .superRefine((values, ctx) => {
    // Edit mode never shows either balance field, so nothing to validate.
    if (values.mode === AccountFormMode.Edit) return

    if (values.balanceMode === BalanceMode.Initial && values.initialBalance.trim() === "") {
      ctx.addIssue({
        code: "custom",
        message: "Enter the opening balance",
        path: ["initialBalance"],
      })
    }

    if (values.balanceMode === BalanceMode.Current && values.currentBalance.trim() === "") {
      ctx.addIssue({
        code: "custom",
        message: "Enter today's balance",
        path: ["currentBalance"],
      })
    }
  })

export type AccountFormValues = z.infer<typeof accountFormSchema>
