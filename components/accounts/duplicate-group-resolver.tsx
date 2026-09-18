"use client"

import { DuplicateResolution, type PreviewRow } from "@/lib/accounts/use-csv-import"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

type DuplicateGroupResolverProps = {
  groupId: string
  rows: PreviewRow[]
  resolution?: DuplicateResolution
  onResolutionChange: (groupId: string, resolution: DuplicateResolution) => void
}

/**
 * Radix's `RadioGroup` hands `onValueChange` a plain `string` — a
 * type-predicate guard, not a cast, is what keeps an unrecognized value
 * from silently becoming a bogus `DuplicateResolution`, per the pattern
 * `account-form-dialog.tsx`'s `isKnownCurrency` already establishes.
 */
function isDuplicateResolution(value: string): value is DuplicateResolution {
  return (Object.values(DuplicateResolution) as readonly string[]).includes(value)
}

const DuplicateGroupResolver = ({
  groupId,
  rows,
  resolution,
  onResolutionChange,
}: DuplicateGroupResolverProps) => {
  return (
    <div className="rounded-[3px] border border-warn bg-warn-soft p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-text-bright">
          ⚠ Matches an existing transaction — same date, amount, description, and counterparty
        </span>
        <span className="text-xs tracking-wide text-warn uppercase">group #{groupId}</span>
      </div>

      <div className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
        {rows.map((row, index) => (
          <div key={index}>
            {row.row.occurred_at} · {row.row.amount} {row.row.currency.toUpperCase()} · &quot;
            {row.row.description}&quot;
          </div>
        ))}
      </div>

      <RadioGroup
        className="mt-3 flex flex-row gap-4"
        value={resolution}
        onValueChange={(value) => {
          if (!isDuplicateResolution(value)) return
          onResolutionChange(groupId, value)
        }}
        aria-label={`Resolution for duplicate group ${groupId}`}
      >
        <Label className="flex items-center gap-2 font-normal">
          <RadioGroupItem value={DuplicateResolution.AddAnyway} /> Add anyway
        </Label>
        <Label className="flex items-center gap-2 font-normal">
          <RadioGroupItem value={DuplicateResolution.Overwrite} /> Overwrite the old one
        </Label>
        <Label className="flex items-center gap-2 font-normal">
          <RadioGroupItem value={DuplicateResolution.Drop} /> Drop the new transaction
        </Label>
      </RadioGroup>
    </div>
  )
}

export default DuplicateGroupResolver
