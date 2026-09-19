"use client"

import { useState } from "react"
import Link from "next/link"

import { formatMoney } from "@/lib/money"
import type { Account } from "@/lib/accounts/use-accounts"
import AccountFormDialog from "@/components/accounts/account-form-dialog"
import DeleteAccountDialog from "@/components/accounts/delete-account-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type AccountCardProps = {
  account: Account
}

const AccountCard = ({ account }: AccountCardProps) => {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  return (
    <>
      <Card className="border border-border transition-colors hover:border-border-bright">
        <CardContent className="flex flex-col gap-4">
          <Link href={`/accounts/${account.code}`} className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-card-foreground">{account.name}</span>
              <Badge variant="outline" className="uppercase tracking-wide">
                {account.currency}
              </Badge>
            </div>

            <p className="font-heading text-xl text-card-foreground">
              {formatMoney(account.balance.amount, account.balance.currency)}
            </p>
          </Link>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="uppercase"
              onClick={() => setIsEditOpen(true)}
            >
              Edit
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="uppercase"
              onClick={() => setIsDeleteOpen(true)}
            >
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      <AccountFormDialog account={account} open={isEditOpen} onOpenChange={setIsEditOpen} />
      <DeleteAccountDialog account={account} open={isDeleteOpen} onOpenChange={setIsDeleteOpen} />
    </>
  )
}

export default AccountCard
