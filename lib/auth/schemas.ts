import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

export type LoginValues = z.infer<typeof loginSchema>

/**
 * Three-letter lowercase codes offered on signup. The backend only
 * validates `currency` against `/\A[a-z]{3}\z/` (any lowercase 3-letter
 * code, per Phase 3's `User` model), so this list is a frontend UX
 * choice, not a backend-enforced enum — it's the set the app's own
 * mockups (accounts/transactions/statistics) actually exercise.
 */
export const CURRENCIES = ["usd", "eur", "gbp", "pln"] as const

export const signupSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(1, "Password is required"),
    passwordConfirmation: z.string().min(1, "Confirm your password"),
    currency: z.enum(CURRENCIES),
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    message: "Passwords don't match",
    path: ["passwordConfirmation"],
  })

export type SignupValues = z.infer<typeof signupSchema>
