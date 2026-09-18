"use client"

import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { ApiError } from "@/lib/api-client"
// Phase 5 (Accounts page) owns this hook.
import { useAccountsQuery } from "@/lib/accounts/use-accounts"
import { useMoveTransactions, type Transaction } from "@/lib/transactions/queries"
import { moveSchema, type MoveValues } from "@/lib/transactions/schemas"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type MoveDialogProps = {
  selectedCodes: string[]
  /**
   * The spec's own props table lists only `{ selectedCodes, open,
   * onOpenChange }`, but this dialog's documented job — "reads the
   * selected rows' currencies, already present in the loaded table
   * data" — isn't derivable from codes alone. `TransactionsPage` already
   * holds the loaded rows, so it passes the matching subset through
   * here rather than this dialog re-fetching or re-deriving them itself.
   */
  selectedTransactions: Transaction[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

/**
 * Destination accounts are filtered to the selection's shared currency
 * client-side, using data already loaded from `useAccountsQuery()`
 * (Phase 5). The backend re-checks the same constraint
 * (`Transactions::Bulk::Move`) regardless, since a client-side filter is
 * a UX convenience here, not the actual safety net.
 */
const MoveDialog = ({
  selectedCodes,
  selectedTransactions,
  open,
  onOpenChange,
  onSuccess = () => {},
}: MoveDialogProps) => {
  const { accounts } = useAccountsQuery()
  const moveMutation = useMoveTransactions()

  const form = useForm<MoveValues>({
    resolver: zodResolver(moveSchema),
    defaultValues: { destinationAccountCode: "" },
  })

  useEffect(() => {
    if (open) {
      form.reset({ destinationAccountCode: "" })
    }
  }, [open, form])

  const currencies = Array.from(new Set(selectedTransactions.map((transaction) => transaction.currency)))
  const isMixedCurrency = currencies.length > 1
  const sharedCurrency = currencies[0]

  const destinationOptions = accounts.filter((account) => account.currency === sharedCurrency)

  const transactionWord = selectedCodes.length === 1 ? "transaction" : "transactions"

  const handleSubmit = async (values: MoveValues) => {
    try {
      const movedCount = await moveMutation.mutateAsync({
        transactionCodes: selectedCodes,
        destinationAccountCode: values.destinationAccountCode,
      })
      toast.success(`Moved ${movedCount} transaction${movedCount === 1 ? "" : "s"}.`)
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      if (error instanceof ApiError && error.code === "currency_mismatch") {
        form.setError("destinationAccountCode", { message: error.message })
        return
      }

      toast.error(error instanceof Error ? error.message : "Something went wrong. Please try again.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move to another account</DialogTitle>
          <DialogDescription>
            {isMixedCurrency
              ? "The selected transactions span more than one currency, so they can't be moved together."
              : `The ${selectedCodes.length} selected ${transactionWord} ${
                  selectedCodes.length === 1 ? "is" : "are"
                } all in ${sharedCurrency?.toUpperCase()}. Only accounts sharing that currency can be selected — a mismatched destination is rejected server-side even if this picker is bypassed.`}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="destinationAccountCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs tracking-wide text-muted-foreground uppercase">
                    Destination account
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={isMixedCurrency}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a destination account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {destinationOptions.map((account) => (
                        <SelectItem key={account.code} value={account.code}>
                          {account.name} ({account.currency.toUpperCase()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="ghost" className="uppercase" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="uppercase"
                disabled={isMixedCurrency || form.formState.isSubmitting}
              >
                {form.formState.isSubmitting
                  ? "Moving..."
                  : `Move ${selectedCodes.length} ${transactionWord}`}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default MoveDialog
