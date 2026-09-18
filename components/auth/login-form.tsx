"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { ApiError } from "@/lib/api-client"
import { useAuth } from "@/lib/auth/auth-context"
import { loginSchema, type LoginValues } from "@/lib/auth/schemas"
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
import { ErrorBanner, Eyebrow } from "@/components/ui/inline-notice"

const LoginForm = () => {
  const { login } = useAuth()
  const [authError, setAuthError] = useState<string | null>(null)

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  const handleSubmit = async (values: LoginValues) => {
    setAuthError(null)

    try {
      await login(values)
    } catch (error) {
      if (error instanceof ApiError && error.code === "invalid_credentials") {
        setAuthError(error.message)
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
        <Eyebrow>$ ./login.sh</Eyebrow>
        <div>
          <h1 className="text-center text-base">Log in to your ledger</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Enter your credentials to access your accounts.
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
          {authError !== null ? <ErrorBanner>{authError}</ErrorBanner> : null}

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

          <Button
            type="submit"
            className="justify-center uppercase"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Logging in..." : "$ LOG_IN"}
          </Button>
        </form>
      </Form>

      <p className="text-center text-sm text-muted-foreground">
        Need an account?{" "}
        <Link href="/signup" className="text-accent-bright no-underline">
          Sign up →
        </Link>
      </p>
    </>
  )
}

export default LoginForm
