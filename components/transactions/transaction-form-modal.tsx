"use client"

import { format } from "date-fns"
import { toast } from "sonner"

import { useAccountsQuery } from "@/lib/accounts/use-accounts"
import {
  useBulkDeleteTransactions,
  useCreateTransaction,
  useUpdateTransaction,
  type Transaction,
} from "@/lib/transactions/queries"
import {
  PAYMENT_METHODS,
  isPaymentMethod,
  toTransactionPayload,
  type TransactionValues,
} from "@/lib/transactions/schemas"
import TransactionForm, { EMPTY_TRANSACTION_VALUES } from "@/components/transactions/transaction-form"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

/** The shape `<input type="datetime-local">` reads and writes. */
const DATETIME_LOCAL_FORMAT = "yyyy-MM-dd'T'HH:mm"

function defaultValuesFor(transaction?: Transaction): TransactionValues {
  if (transaction === undefined) return EMPTY_TRANSACTION_VALUES

  return {
    occurredAt: format(new Date(transaction.occurredAt), DATETIME_LOCAL_FORMAT),
    amount: transaction.amount,
    category: transaction.category,
    description: transaction.description,
    // `Transaction.paymentMethod` arrives as a plain `string` off the
    // wire, so it's narrowed through the shared guard rather than cast —
    // an unrecognized value falls back to the first offered option
    // instead of crashing the resolver.
    paymentMethod: isPaymentMethod(transaction.paymentMethod)
      ? transaction.paymentMethod
      : PAYMENT_METHODS[0],
    counterparty: { counterpartyCode: transaction.counterparty.code },
  }
}

type TransactionFormModalProps = {
  open: boolean
  accountCode: string
  transaction?: Transaction
  onOpenChange?: (open: boolean) => void
}

/**
 * `TransactionForm` in a Shadcn `Dialog`. Create mode when `transaction`
 * is omitted, edit mode when it's provided — the only difference being
 * which mutation the submit runs and whether the fields start pre-filled.
 *
 * Edit mode also offers deletion, which goes through Phase 7's bulk-delete
 * endpoint with this one transaction selected: the Transactions domain
 * already owns a delete action, and a second single-record one would be
 * the exact duplication the shared-controller rule exists to prevent.
 */
const TransactionFormModal = ({
  open,
  accountCode,
  transaction,
  onOpenChange = () => {},
}: TransactionFormModalProps) => {
  const isEditMode = transaction !== undefined
  // The form's disabled currency field shows the *account's* currency, so
  // it's read from the accounts list this page already loads (Phase 5's
  // hook, the same cache `AccountSwitcher` reads) rather than drilled in
  // as another prop.
  const { accounts } = useAccountsQuery()
  const accountCurrency = accounts.find((account) => account.code === accountCode)?.currency ?? ""
  const createTransaction = useCreateTransaction()
  const updateTransaction = useUpdateTransaction()
  const deleteTransactions = useBulkDeleteTransactions()

  // Left uncaught on purpose: `TransactionForm` is the one component
  // holding a reference to the form instance a `missing_counterparty`
  // error needs to attach to, so this handler lets the mutation's
  // rejection propagate up through its `onSubmit` call rather than
  // swallowing it into a toast here first.
  const handleSubmit = async (values: TransactionValues) => {
    const payload = toTransactionPayload(accountCode, values)

    if (isEditMode) {
      await updateTransaction.mutateAsync({ code: transaction.code, payload })
    } else {
      await createTransaction.mutateAsync(payload)
    }

    onOpenChange(false)
  }

  const handleDelete = async () => {
    if (!isEditMode) return

    try {
      await deleteTransactions.mutateAsync([transaction.code])
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't delete this transaction.")
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditMode ? "$ Edit transaction" : "$ New transaction"}</DialogTitle>
        </DialogHeader>

        <TransactionForm
          // Remounting on the edited transaction (and on each reopen)
          // is what re-seeds `react-hook-form`'s defaults, which it only
          // reads once per mount.
          key={`${transaction?.code ?? "new"}-${String(open)}`}
          accountCurrency={accountCurrency}
          defaultValues={defaultValuesFor(transaction)}
          submitLabel={isEditMode ? "$ SAVE_CHANGES" : "$ CREATE_TRANSACTION"}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />

        {isEditMode ? (
          <div className="flex justify-start border-t border-border pt-3">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="uppercase"
              onClick={handleDelete}
              disabled={deleteTransactions.isPending}
            >
              Delete transaction
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export default TransactionFormModal
