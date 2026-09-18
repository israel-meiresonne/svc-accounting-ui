"use client"

import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { useBulkUpdateTransactions } from "@/lib/transactions/queries"
import {
  NO_CHANGE,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  bulkUpdateSchema,
  toBulkUpdateAttributes,
  type BulkUpdateValues,
  type PaymentMethodValue,
} from "@/lib/transactions/schemas"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const DEFAULT_VALUES: BulkUpdateValues = { category: "", paymentMethod: NO_CHANGE, description: "" }

type BulkUpdateDialogProps = {
  selectedCodes: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

/**
 * Only `category`, `payment_method`, and `description` are bulk-editable
 * — `Transactions::Bulk::Update::ALLOWED_ATTRIBUTES` excludes `amount`,
 * `currency`, `account_id`, and `counterparty_id`, since none of those
 * are safe to reassign across many rows through a form this narrow.
 */
const BulkUpdateDialog = ({ selectedCodes, open, onOpenChange, onSuccess = () => {} }: BulkUpdateDialogProps) => {
  const bulkUpdateMutation = useBulkUpdateTransactions()

  const form = useForm<BulkUpdateValues>({
    resolver: zodResolver(bulkUpdateSchema),
    defaultValues: DEFAULT_VALUES,
  })

  useEffect(() => {
    if (open) {
      form.reset(DEFAULT_VALUES)
    }
  }, [open, form])

  const handleSubmit = async (values: BulkUpdateValues) => {
    try {
      const updatedCount = await bulkUpdateMutation.mutateAsync({
        transactionCodes: selectedCodes,
        attributes: toBulkUpdateAttributes(values),
      })
      toast.success(`Updated ${updatedCount} transaction${updatedCount === 1 ? "" : "s"}.`)
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong. Please try again.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update properties</DialogTitle>
        </DialogHeader>

        <p className="rounded-[3px] border border-border-bright bg-accent-soft px-4 py-3 text-sm text-accent-bright">
          This updates <strong>{selectedCodes.length}</strong> selected transaction
          {selectedCodes.length === 1 ? "" : "s"}. Only category, payment method, and description can be
          bulk-edited &mdash; amount, currency, account, and sender/recipient must be changed one transaction at a
          time.
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs tracking-wide text-muted-foreground uppercase">Category</FormLabel>
                  <FormControl>
                    <Input placeholder="Leave blank to keep each transaction's own category" {...field} />
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
                  <FormLabel className="text-xs tracking-wide text-muted-foreground uppercase">
                    Payment method
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_CHANGE}>Keep each transaction&apos;s own payment method</SelectItem>
                      {PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method} value={method}>
                          {PAYMENT_METHOD_LABELS[method as PaymentMethodValue]}
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs tracking-wide text-muted-foreground uppercase">
                    Description
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Leave blank to keep each transaction's own description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="ghost" className="uppercase" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" className="uppercase" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? "Updating..."
                  : `Update ${selectedCodes.length} transaction${selectedCodes.length === 1 ? "" : "s"}`}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default BulkUpdateDialog
