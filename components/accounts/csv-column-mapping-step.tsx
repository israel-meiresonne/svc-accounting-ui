"use client"

import { useState } from "react"

import type { Account } from "@/lib/accounts/use-accounts"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type RawCsvRow = Record<string, string>

export type ResolvedCsvRow = RawCsvRow & { account_code: string }

type CsvColumnMappingStepProps = {
  parsedRows: RawCsvRow[]
  accounts: Account[]
  onResolved: (rows: ResolvedCsvRow[]) => void
}

function distinctAccountNames(rows: RawCsvRow[]): string[] {
  const names = rows
    .map((row) => row.account?.trim())
    .filter((name): name is string => Boolean(name))

  return Array.from(new Set(names))
}

function findAccountCodeByName(accounts: Account[], name: string): string {
  const match = accounts.find((account) => account.name.toLowerCase() === name.toLowerCase())
  return match?.code ?? accounts[0]?.code ?? ""
}

/**
 * Maps each parsed row's `account` name to a real `account_code`, or lets
 * the user pick one account for every row when there's no per-row
 * `account` column — per the phase spec, `CsvImportDialog` always renders
 * this step regardless of which of those two cases the parsed file is in.
 */
const CsvColumnMappingStep = ({ parsedRows, accounts, onResolved }: CsvColumnMappingStepProps) => {
  const accountNames = distinctAccountNames(parsedRows)
  const hasPerRowAccounts = accountNames.length > 1

  const [defaultAccountCode, setDefaultAccountCode] = useState(accounts[0]?.code ?? "")
  const [nameMapping, setNameMapping] = useState<Record<string, string>>(() =>
    Object.fromEntries(accountNames.map((name) => [name, findAccountCodeByName(accounts, name)]))
  )

  const handleContinue = () => {
    const resolvedRows = parsedRows.map((row) => {
      const rawName = row.account?.trim()
      const accountCode = hasPerRowAccounts && rawName ? nameMapping[rawName] : defaultAccountCode

      return { ...row, account_code: accountCode ?? defaultAccountCode }
    })

    onResolved(resolvedRows)
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        Columns must match a transaction&apos;s fields. An optional <code>account</code> column
        lets one file target multiple accounts — otherwise every row is uploaded into the account
        you pick below.
      </p>

      {hasPerRowAccounts ? (
        <div className="flex flex-col gap-3">
          {accountNames.map((name) => (
            <div key={name} className="flex items-center justify-between gap-3">
              <Label>{name}</Label>
              <Select
                value={nameMapping[name] ?? ""}
                onValueChange={(value) => setNameMapping((prev) => ({ ...prev, [name]: value }))}
              >
                <SelectTrigger aria-label={`Target account for ${name}`} className="w-56">
                  <SelectValue placeholder="Select an account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.code} value={account.code}>
                      {account.name} ({account.currency.toUpperCase()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <Label>Target account</Label>
          <Select value={defaultAccountCode} onValueChange={setDefaultAccountCode}>
            <SelectTrigger aria-label="Target account" className="w-56">
              <SelectValue placeholder="Select an account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.code} value={account.code}>
                  {account.name} ({account.currency.toUpperCase()})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Button type="button" className="w-fit justify-center uppercase" onClick={handleContinue}>
        $ CONTINUE
      </Button>
    </div>
  )
}

export default CsvColumnMappingStep
