"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { ApiError } from "@/lib/api-client"
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  transactionSchema,
  type TransactionValues,
} from "@/lib/transactions/schemas"
import CounterpartyPicker from "@/components/transactions/counterparty-picker"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const LABEL_CLASS = "text-xs tracking-wide text-muted-foreground uppercase"

/** An untouched create form: every field blank, no counterparty chosen yet. */
export const EMPTY_TRANSACTION_VALUES: TransactionValues = {
  occurredAt: "",
  amount: "",
  category: "",
  description: "",
  paymentMethod: PAYMENT_METHODS[0],
  counterparty: {},
}

type TransactionFormProps = {
  accountCurrency: string
  defaultValues?: TransactionValues
  submitLabel?: string
  onSubmit?: (values: TransactionValues) => void | Promise<void>
  onCancel?: () => void
}

/**
 * The create and edit form for one transaction, bound to
 * `transactionSchema`.
 *
 * Currency is rendered as a disabled, display-only field showing the
 * owning account's currency: the backend reads a transaction's currency
 * from its account and never from request params, so there is no value
 * this form could submit that wouldn't risk disagreeing with the account.
 *
 * The payment-method options come from `PAYMENT_METHODS`, the one place
 * in this frontend that mirrors `Transaction.payment_methods.keys` — not
 * a second hardcoded list that could drift from the backend enum.
 */
const TransactionForm = ({
  accountCurrency,
  defaultValues = EMPTY_TRANSACTION_VALUES,
  submitLabel = "$ SAVE",
  onSubmit = () => {},
  onCancel = () => {},
}: TransactionFormProps) => {
  const form = useForm<TransactionValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues,
  })

  /**
   * A backend error that maps onto a field is shown *on* that field rather
   * than as a toast, the same way `MoveDialog` and `ReportDialog` handle
   * theirs. This is the one component holding a reference to the form
   * instance those errors belong on, which is why both the mapping and the
   * generic fallback happen here rather than in the caller:
   * `missing_counterparty` (`Transactions::Errors::MissingCounterpartyError`)
   * is exactly the counterparty field's problem; `onSubmit` itself is left
   * to throw on any other failure rather than swallowing it before it gets
   * here.
   */
  const handleSubmit = async (values: TransactionValues) => {
    try {
      await onSubmit(values)
    } catch (error) {
      if (error instanceof ApiError && error.code === "missing_counterparty") {
        form.setError("counterparty", { message: error.message })
        return
      }

      toast.error(error instanceof Error ? error.message : "Couldn't save this transaction.")
    }
  }

  const isSubmitting = form.formState.isSubmitting

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="occurredAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={LABEL_CLASS}>Date and time</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-3">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel className={LABEL_CLASS}>Amount</FormLabel>
                <FormControl>
                  <Input placeholder="-24.90" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex w-28 flex-col gap-2">
            <Label htmlFor="transaction-currency" className={LABEL_CLASS}>
              Currency
            </Label>
            <Input
              id="transaction-currency"
              value={accountCurrency.toUpperCase()}
              disabled
              readOnly
            />
          </div>
        </div>

        <p className="-mt-2 text-sm text-muted-foreground">
          A negative amount is an expense, a positive one is income. Currency always follows the
          account.
        </p>

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={LABEL_CLASS}>Category</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Groceries" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="paymentMethod"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={LABEL_CLASS}>Payment method</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger aria-label="Payment method" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {PAYMENT_METHODS.map((paymentMethod) => (
                    <SelectItem key={paymentMethod} value={paymentMethod}>
                      {PAYMENT_METHOD_LABELS[paymentMethod]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="counterparty"
          render={({ field }) => (
            <FormItem>
              {/* A plain caption, not a `FormLabel`: the picker is a
                  composite of several inputs with labels of their own, so
                  there is no single control for a label to point at. */}
              <p className={LABEL_CLASS}>Counterparty</p>
              <CounterpartyPicker value={field.value} onChange={field.onChange} />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={LABEL_CLASS}>Description</FormLabel>
              <FormControl>
                <Input placeholder="Optional note" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" className="uppercase" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" className="uppercase" disabled={isSubmitting}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  )
}

export default TransactionForm
