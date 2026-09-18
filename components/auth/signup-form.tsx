"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { ApiError } from "@/lib/api-client"
import { useAuth } from "@/lib/auth/auth-context"
import { CURRENCIES, signupSchema, type SignupValues } from "@/lib/auth/schemas"
import { AuthErrorBanner, AuthEyebrow } from "@/components/auth/auth-form-ui"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/**
 * Maps the snake_case field names Rails' `errors.as_json` responds with
 * (per the overview's error shape) to this form's own camelCase field
 * names, so a backend validation failure (a duplicate email, a
 * confirmation mismatch) can be routed into `form.setError` the same
 * way a client-side `zod` failure is, instead of a second bespoke
 * error-rendering path.
 */
const SIGNUP_FIELD_BY_API_KEY: Record<string, keyof SignupValues> = {
  first_name: "firstName",
  last_name: "lastName",
  email: "email",
  password: "password",
  password_confirmation: "passwordConfirmation",
  currency: "currency",
}

const SignupForm = () => {
  const { signup } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      passwordConfirmation: "",
      currency: "usd",
    },
  })

  const applyServerErrors = (details: Record<string, unknown>) => {
    Object.entries(details).forEach(([apiKey, messages]) => {
      const field = SIGNUP_FIELD_BY_API_KEY[apiKey]

      if (!field) return

      const message = Array.isArray(messages) ? String(messages[0]) : String(messages)
      form.setError(field, { message })
    })
  }

  const handleSubmit = async (values: SignupValues) => {
    setFormError(null)

    try {
      await signup(values)
    } catch (error) {
      if (error instanceof ApiError && error.code === "validation_failed") {
        applyServerErrors(error.details)
        setFormError("We couldn't create your account — see the fields below.")
        return
      }

      // Anything else (a network failure, a 500, a shape of error this
      // form doesn't have dedicated handling for) still needs to surface
      // to the user somehow, rather than vanishing as a silent rejection.
      toast.error(error instanceof Error ? error.message : "Something went wrong. Please try again.")
    }
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <AuthEyebrow>$ ./signup.sh</AuthEyebrow>
        <div>
          <h1 className="text-center text-base">Create your ledger</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            One account, unlimited ledgers — set up your login below.
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
          {formError !== null ? <AuthErrorBanner>{formError}</AuthErrorBanner> : null}

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs tracking-wide text-muted-foreground uppercase">
                    First name
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Priya" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs tracking-wide text-muted-foreground uppercase">
                    Last name
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Nair" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs tracking-wide text-muted-foreground uppercase">
                  Email
                </FormLabel>
                <FormControl>
                  <Input type="email" placeholder="you@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs tracking-wide text-muted-foreground uppercase">
                    Password
                  </FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="passwordConfirmation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs tracking-wide text-muted-foreground uppercase">
                    Confirm password
                  </FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs tracking-wide text-muted-foreground uppercase">
                  Main currency
                </FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a currency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="justify-center uppercase"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Creating account..." : "$ CREATE_ACCOUNT"}
          </Button>
        </form>
      </Form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-accent-bright no-underline">
          Log in →
        </Link>
      </p>
    </>
  )
}

export default SignupForm
