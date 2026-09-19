"use client"

import { useEffect, useState, type ChangeEvent } from "react"

import { useCounterpartySearch, type CounterpartySearchResult } from "@/lib/transactions/queries"
import {
  COUNTERPARTY_TYPES,
  type CounterpartyOptions,
  type CounterpartyType,
  type CounterpartyValue,
} from "@/lib/transactions/schemas"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const SEARCH_DEBOUNCE_MS = 300

const COUNTERPARTY_TYPE_LABELS: Record<CounterpartyType, string> = {
  contact: "Person",
  company: "Company",
}

function isCounterpartyType(value: string): value is CounterpartyType {
  return (COUNTERPARTY_TYPES as readonly string[]).includes(value)
}

function newCounterpartyOptions(typedText: string): CounterpartyOptions {
  return { type: "contact", firstName: typedText, lastName: "", companyName: "" }
}

type CounterpartyPickerProps = {
  value: CounterpartyValue
  onChange?: (value: CounterpartyValue) => void
}

/**
 * The transaction form's single counterparty field, in two mutually
 * exclusive modes.
 *
 * Search mode: typing debounces into `useCounterpartySearch`, and picking
 * a result emits `{ counterpartyCode }` — an existing counterparty the
 * backend resolves by code. Create mode, entered through the
 * "create new" option, emits `{ counterpartyOptions }` instead, which
 * `Users::ResolveCounterparty` turns into a brand-new contact or company.
 *
 * Name fields only: `User.image` has no upload path anywhere in this
 * app, so a counterparty created here always has a `null` image and
 * there is nothing for an image field to collect.
 */
const CounterpartyPicker = ({ value, onChange = () => {} }: CounterpartyPickerProps) => {
  const [searchText, setSearchText] = useState("")
  const [debouncedSearchText, setDebouncedSearchText] = useState("")
  // What the last picked result was called, so the selected state can show
  // a name rather than the opaque `usr_…` code. Edit mode starts with only
  // a code (that's all the form's default values carry), which is why this
  // falls back to the code instead of assuming a name is always known.
  const [pickedCounterparty, setPickedCounterparty] = useState<CounterpartySearchResult | null>(null)
  const { counterparties, isLoading } = useCounterpartySearch(debouncedSearchText)

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearchText(searchText), SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timeout)
  }, [searchText])

  const newCounterparty = value.counterpartyOptions
  const isCreating = newCounterparty !== undefined

  const handleSearchTextChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchText(event.target.value)
  }

  const handleSelectExisting = (counterparty: CounterpartySearchResult) => {
    setSearchText("")
    setDebouncedSearchText("")
    setPickedCounterparty(counterparty)
    onChange({ counterpartyCode: counterparty.code })
  }

  const handleStartCreating = () => {
    onChange({ counterpartyOptions: newCounterpartyOptions(searchText.trim()) })
  }

  const handleCancelCreating = () => {
    onChange({})
  }

  const changeNewCounterparty = (partial: Partial<CounterpartyOptions>) => {
    if (!isCreating) return

    onChange({ counterpartyOptions: { ...newCounterparty, ...partial } })
  }

  const handleTypeChange = (type: string) => {
    if (!isCounterpartyType(type)) return

    changeNewCounterparty({ type })
  }

  const handleFirstNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    changeNewCounterparty({ firstName: event.target.value })
  }

  const handleLastNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    changeNewCounterparty({ lastName: event.target.value })
  }

  const handleCompanyNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    changeNewCounterparty({ companyName: event.target.value })
  }

  const handleClearSelection = () => {
    onChange({})
  }

  if (isCreating) {
    return (
      <div className="flex flex-col gap-2 rounded-[2px] border border-border p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs tracking-wide text-muted-foreground uppercase">New counterparty</span>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="uppercase"
            onClick={handleCancelCreating}
          >
            Cancel
          </Button>
        </div>

        <Select value={newCounterparty.type} onValueChange={handleTypeChange}>
          <SelectTrigger aria-label="Counterparty type" size="sm" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COUNTERPARTY_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {COUNTERPARTY_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {newCounterparty.type === "company" ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="counterparty-company-name">Company name</Label>
            <Input
              id="counterparty-company-name"
              value={newCounterparty.companyName}
              onChange={handleCompanyNameChange}
              placeholder="e.g. Acme Ltd"
            />
          </div>
        ) : (
          <div className="flex gap-2">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="counterparty-first-name">First name</Label>
              <Input
                id="counterparty-first-name"
                value={newCounterparty.firstName}
                onChange={handleFirstNameChange}
                placeholder="e.g. Ada"
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="counterparty-last-name">Last name</Label>
              <Input
                id="counterparty-last-name"
                value={newCounterparty.lastName}
                onChange={handleLastNameChange}
                placeholder="e.g. Lovelace"
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  if (value.counterpartyCode !== undefined) {
    const selectedLabel =
      pickedCounterparty?.code === value.counterpartyCode
        ? pickedCounterparty.displayName
        : value.counterpartyCode

    return (
      <div className="flex items-center justify-between gap-2 rounded-[2px] border border-border px-3 py-2">
        <span className="text-sm text-card-foreground" data-testid="selected-counterparty">
          {selectedLabel}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="uppercase"
          onClick={handleClearSelection}
        >
          Change
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <Input
        value={searchText}
        onChange={handleSearchTextChange}
        placeholder="Search counterparties"
        aria-label="Search counterparties"
      />

      {searchText.trim() === "" ? null : (
        <div className="flex flex-col gap-1 rounded-[2px] border border-border p-1">
          {isLoading ? <p className="px-2 py-1 text-sm text-muted-foreground">Searching...</p> : null}

          {counterparties.map((counterparty) => (
            <Button
              key={counterparty.code}
              type="button"
              variant="ghost"
              size="sm"
              className="justify-start"
              onClick={() => handleSelectExisting(counterparty)}
            >
              {counterparty.displayName}
            </Button>
          ))}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="justify-start"
            onClick={handleStartCreating}
          >
            {`Create new: ${searchText.trim()}`}
          </Button>
        </div>
      )}
    </div>
  )
}

export default CounterpartyPicker
