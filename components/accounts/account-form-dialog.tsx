"use client"

import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { ApiError } from "@/lib/api-client"
import {
  useCreateAccount,
  useUpdateAccount,
  type Account,
  type CreateAccountPayload,
} from "@/lib/accounts/use-accounts"
import {
  AccountFormMode,
  BalanceMode,
  CURRENCIES,
  accountFormSchema,
  type AccountFormValues,
} from "@/lib/accounts/schemas"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type AccountFormDialogProps = {
  account?: Account
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * `Account.currency` is a plain `string` (the backend accepts any
 * lowercase 3-letter code), while the form field is narrowed to this
 * dialog's own offered `CURRENCIES` — a type-predicate guard, not a cast,
 * is what lets an account already saved with a currency outside that
 * list still open in edit mode without crashing `zodResolver`.
 */
function isKnownCurrency(value: string): value is AccountFormValues["currency"] {
  return (CURRENCIES as readonly string[]).includes(value)
}

function defaultValuesFor(account?: Account): AccountFormValues {
  if (account) {
    return {
      mode: AccountFormMode.Edit,
      name: account.name,
      currency: isKnownCurrency(account.currency) ? account.currency : CURRENCIES[0],
      balanceMode: BalanceMode.Initial,
      initialBalance: "",
      currentBalance: "",
    }
  }

  return {
    mode: AccountFormMode.Create,
    name: "",
    currency: "usd",
    balanceMode: BalanceMode.Initial,
    initialBalance: "",
    currentBalance: "",
  }
}

function toCreatePayload(values: AccountFormValues): CreateAccountPayload {
  return {
    name: values.name,
    currency: values.currency,
    initial_balance: values.balanceMode === BalanceMode.Initial ? values.initialBalance : null,
    current_balance: values.balanceMode === BalanceMode.Current ? values.currentBalance : null,
  }
}

/**
 * No `account` prop means create mode: name, currency, and a radio choice
 * between an opening-balance and a current-balance entry, both resolving
 * into the same `{ initial_balance, current_balance }` request shape, one
 * of the two always `null`. An `account` prop means edit mode: name and
 * currency only, with the currency field disabled (and an explanatory
 * hint shown) once the account has transactions, mirroring
 * `Accounts::Errors::CurrencyChangeNotAllowedError`.
 */
const AccountFormDialog = ({ account, open, onOpenChange }: AccountFormDialogProps) => {
  const isEditMode = account !== undefined
  const createAccount = useCreateAccount()
  const updateAccount = useUpdateAccount()

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: defaultValuesFor(account),
  })

  useEffect(() => {
    if (open) {
      form.reset(defaultValuesFor(account))
    }
    // `form` is a stable react-hook-form instance across renders; only
    // reopening the dialog or switching which account it edits should
    // reset its fields.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, account])

  const balanceMode = form.watch("balanceMode")
  const isCurrencyLocked = isEditMode && account.hasTransactions

  const handleSubmit = async (values: AccountFormValues) => {
    try {
      if (isEditMode) {
        await updateAccount.mutateAsync({
          code: account.code,
          name: values.name,
          currency: values.currency,
        })
      } else {
        await createAccount.mutateAsync(toCreatePayload(values))
      }

      onOpenChange(false)
    } catch (error) {
      if (error instanceof ApiError && error.code === "currency_change_not_allowed") {
        form.setError("currency", { message: error.message })
        return
      }

      toast.error(error instanceof Error ? error.message : "Couldn't save this account.")
    }
  }

  const isSubmitting = form.formState.isSubmitting

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? `$ Edit account — ${account.name}` : "$ New account"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs tracking-wide text-muted-foreground uppercase">
                    Account name
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Everyday Checking" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs tracking-wide text-muted-foreground uppercase">
                    Currency
                  </FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isCurrencyLocked}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
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
                  {isCurrencyLocked ? (
                    <p className="text-sm text-muted-foreground">
                      Locked — this account already has transactions, so its currency can&apos;t
                      change.
                    </p>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />

            {isEditMode ? null : (
              <>
                <FormField
                  control={form.control}
                  name="balanceMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs tracking-wide text-muted-foreground uppercase">
                        Opening balance
                      </FormLabel>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="flex flex-col gap-2"
                      >
                        <Label className="flex items-center gap-2 font-normal">
                          <RadioGroupItem value={BalanceMode.Initial} /> I know the opening
                          balance
                        </Label>
                        <Label className="flex items-center gap-2 font-normal">
                          <RadioGroupItem value={BalanceMode.Current} /> I know today&apos;s
                          balance
                        </Label>
                      </RadioGroup>
                    </FormItem>
                  )}
                />

                {balanceMode === BalanceMode.Initial ? (
                  <FormField
                    control={form.control}
                    name="initialBalance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs tracking-wide text-muted-foreground uppercase">
                          Opening balance (as of account creation)
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <FormField
                    control={form.control}
                    name="currentBalance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs tracking-wide text-muted-foreground uppercase">
                          Current balance (today)
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="0.00" {...field} />
                        </FormControl>
                        <p className="text-sm text-muted-foreground">
                          Once you import this account&apos;s transaction history, the opening
                          balance is derived as current balance minus every imported transaction.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                className="uppercase"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="uppercase" disabled={isSubmitting}>
                {isEditMode ? "$ SAVE_CHANGES" : "$ CREATE_ACCOUNT"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default AccountFormDialog
