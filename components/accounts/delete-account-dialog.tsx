"use client"

import { toast } from "sonner"

import { useDeleteAccount, type Account } from "@/lib/accounts/use-accounts"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ErrorBanner } from "@/components/ui/inline-notice"

type DeleteAccountDialogProps = {
  account: Account
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DeleteAccountDialog = ({ account, open, onOpenChange }: DeleteAccountDialogProps) => {
  const deleteAccount = useDeleteAccount()

  const handleDelete = () => {
    deleteAccount.mutate(account.code, {
      onSuccess: () => onOpenChange(false),
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Couldn't delete this account.")
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>$ Delete account?</DialogTitle>
        </DialogHeader>

        <ErrorBanner>
          This will soft-delete <strong>{account.name}</strong>. It&apos;s recoverable for 30
          days, then purged permanently.
        </ErrorBanner>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            className="uppercase"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="uppercase"
            onClick={handleDelete}
            disabled={deleteAccount.isPending}
          >
            {deleteAccount.isPending ? "Deleting..." : "$ DELETE_ACCOUNT"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DeleteAccountDialog
