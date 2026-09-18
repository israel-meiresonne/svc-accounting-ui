"use client"

import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { ApiError } from "@/lib/api-client"
import { triggerDownload, useGenerateReport, type Transaction } from "@/lib/transactions/queries"
import { reportSchema, type ReportValues } from "@/lib/transactions/schemas"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type ReportDialogProps = {
  selectedCodes: string[]
  /** See the same note in `move-dialog.tsx` re: this prop vs. the spec's literal props table. */
  selectedTransactions: Transaction[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * The `reporting_currency` field only appears when the selection's
 * currencies (computed client-side from already-loaded rows) aren't all
 * identical — otherwise the single shared currency is sent without ever
 * showing the field, per the phase spec.
 */
const ReportDialog = ({ selectedCodes, selectedTransactions, open, onOpenChange }: ReportDialogProps) => {
  const generateReportMutation = useGenerateReport()

  const currencies = Array.from(new Set(selectedTransactions.map((transaction) => transaction.currency)))
  const isMixedCurrency = currencies.length > 1

  const form = useForm<ReportValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: { title: "", description: "", reportingCurrency: currencies[0] ?? "" },
  })

  useEffect(() => {
    if (open) {
      form.reset({ title: "", description: "", reportingCurrency: currencies[0] ?? "" })
    }
    // `currencies` is a new array each render; comparing on `open` alone
    // is intentional so this only resets when the dialog actually opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleSubmit = async (values: ReportValues) => {
    try {
      const pdf = await generateReportMutation.mutateAsync({
        transactionCodes: selectedCodes,
        title: values.title,
        description: values.description,
        reportingCurrency: isMixedCurrency ? values.reportingCurrency : currencies[0],
      })
      triggerDownload(pdf, "report.pdf")
      onOpenChange(false)
    } catch (error) {
      if (error instanceof ApiError && error.code === "currency_rate_unavailable") {
        form.setError("reportingCurrency", { message: error.message })
        return
      }

      toast.error(error instanceof Error ? error.message : "Something went wrong. Please try again.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate PDF report</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs tracking-wide text-muted-foreground uppercase">
                    Report title
                  </FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
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
                    Report description
                  </FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isMixedCurrency ? (
              <FormField
                control={form.control}
                name="reportingCurrency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs tracking-wide text-muted-foreground uppercase">
                      Reporting currency
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {currencies.map((currency) => (
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
            ) : null}

            <DialogFooter>
              <Button type="button" variant="ghost" className="uppercase" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" className="uppercase" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Generating..." : "$ Generate PDF"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default ReportDialog
