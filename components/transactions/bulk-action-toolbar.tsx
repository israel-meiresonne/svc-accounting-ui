"use client"

import { useState } from "react"
import { toast } from "sonner"

import { triggerDownload, useBulkDeleteTransactions, useExportTransactionsCsv, type Transaction } from "@/lib/transactions/queries"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import BulkUpdateDialog from "@/components/transactions/bulk-update-dialog"
import MoveDialog from "@/components/transactions/move-dialog"
import ReportDialog from "@/components/transactions/report-dialog"

type BulkActionToolbarProps = {
  selectedCodes: string[]
  selectedTransactions: Transaction[]
  onActionSuccess?: () => void
}

/**
 * No established convention exists yet in this codebase for "a toolbar
 * that only shows once a selection exists" (the first one), so this
 * component owns that guard itself (a ternary, not a bare `&&`, per
 * FS-18) rather than trusting every future caller to remember to wrap it
 * in a condition.
 */
const BulkActionToolbar = ({ selectedCodes, selectedTransactions, onActionSuccess = () => {} }: BulkActionToolbarProps) => {
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false)
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false)
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const exportCsvMutation = useExportTransactionsCsv()
  const bulkDeleteMutation = useBulkDeleteTransactions()

  const handleExportCsv = async () => {
    try {
      const csv = await exportCsvMutation.mutateAsync(selectedCodes)
      triggerDownload(csv, "transactions.csv")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong. Please try again.")
    }
  }

  const handleConfirmDelete = async () => {
    try {
      const deletedCount = await bulkDeleteMutation.mutateAsync(selectedCodes)
      toast.success(`Deleted ${deletedCount} transaction${deletedCount === 1 ? "" : "s"}.`)
      setIsDeleteDialogOpen(false)
      onActionSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong. Please try again.")
    }
  }

  return selectedCodes.length > 0 ? (
    <div className="flex items-center gap-3 rounded-[3px] border border-border-bright bg-card px-4 py-2.5">
      <span className="text-sm text-accent-bright">
        {selectedCodes.length} selected
      </span>
      <span className="flex-1" />
      <Button variant="ghost" size="sm" className="uppercase" onClick={() => setIsUpdateDialogOpen(true)}>
        Update properties
      </Button>
      <Button variant="destructive" size="sm" className="uppercase" onClick={() => setIsDeleteDialogOpen(true)}>
        Delete
      </Button>
      <Button variant="ghost" size="sm" className="uppercase" onClick={() => setIsMoveDialogOpen(true)}>
        Move to another account
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="uppercase"
        onClick={handleExportCsv}
        disabled={exportCsvMutation.isPending}
      >
        {exportCsvMutation.isPending ? "Exporting..." : "Export CSV"}
      </Button>
      <Button size="sm" className="uppercase" onClick={() => setIsReportDialogOpen(true)}>
        Generate PDF report
      </Button>

      <BulkUpdateDialog
        selectedCodes={selectedCodes}
        open={isUpdateDialogOpen}
        onOpenChange={setIsUpdateDialogOpen}
        onSuccess={onActionSuccess}
      />
      <MoveDialog
        selectedCodes={selectedCodes}
        selectedTransactions={selectedTransactions}
        open={isMoveDialogOpen}
        onOpenChange={setIsMoveDialogOpen}
        onSuccess={onActionSuccess}
      />
      <ReportDialog
        selectedCodes={selectedCodes}
        selectedTransactions={selectedTransactions}
        open={isReportDialogOpen}
        onOpenChange={setIsReportDialogOpen}
      />

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>$ Delete transactions</DialogTitle>
          </DialogHeader>
          <p className="rounded-[3px] border border-warn bg-warn-soft px-4 py-3 text-sm text-warn">
            You&apos;re about to delete <strong>{selectedCodes.length}</strong> transaction
            {selectedCodes.length === 1 ? "" : "s"}. They&apos;re soft-deleted and can be restored within 30 days
            before the nightly purge task removes them permanently.
          </p>
          <DialogFooter>
            <Button variant="ghost" className="uppercase" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="uppercase"
              onClick={handleConfirmDelete}
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending
                ? "Deleting..."
                : `$ Delete ${selectedCodes.length} transaction${selectedCodes.length === 1 ? "" : "s"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  ) : null
}

export default BulkActionToolbar
