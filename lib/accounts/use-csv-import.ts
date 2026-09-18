"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { apiClient } from "@/lib/api-client"
import { ACCOUNTS_QUERY_KEY } from "@/lib/accounts/use-accounts"

export const CounterpartyType = {
  Contact: "contact",
  Company: "company",
} as const

export type CounterpartyType = (typeof CounterpartyType)[keyof typeof CounterpartyType]

/**
 * The flat row shape both import endpoints expect, matching a
 * `Transaction`'s own fields per the phase spec's "Raw CSV columns"
 * section. The frontend resolves an `account` column to this
 * `account_code`, and splits a `counterparty_name` column into these
 * first/last/company fields, before either endpoint ever sees a row —
 * neither endpoint ever receives a raw account name or an unsplit
 * counterparty name.
 */
export type ImportRow = {
  account_code: string
  occurred_at: string
  amount: string
  currency: string
  payment_method: string
  category: string
  description: string
  counterparty_type: CounterpartyType
  counterparty_first_name: string | null
  counterparty_last_name: string | null
  counterparty_company_name: string | null
  counterparty_email: string | null
}

export const PreviewRowStatus = {
  Ok: "ok",
  Invalid: "invalid",
  Duplicate: "duplicate",
} as const

export type PreviewRowStatus = (typeof PreviewRowStatus)[keyof typeof PreviewRowStatus]

export type PreviewRow = {
  row: ImportRow
  status: PreviewRowStatus
  counterpartyCode: string | null
  dedupHash: string | null
  duplicateGroupId: string | null
  errors: string[]
}

type PreviewRowDto = {
  row: ImportRow
  status: PreviewRowStatus
  counterparty_code?: string
  dedup_hash?: string
  duplicate_group_id?: string | null
  errors?: string[]
}

function toPreviewRow(dto: PreviewRowDto): PreviewRow {
  return {
    row: dto.row,
    status: dto.status,
    counterpartyCode: dto.counterparty_code ?? null,
    dedupHash: dto.dedup_hash ?? null,
    duplicateGroupId: dto.duplicate_group_id ?? null,
    errors: dto.errors ?? [],
  }
}

export const DuplicateResolution = {
  AddAnyway: "add_anyway",
  Overwrite: "overwrite",
  Drop: "drop",
} as const

export type DuplicateResolution = (typeof DuplicateResolution)[keyof typeof DuplicateResolution]

/**
 * What the commit endpoint needs for one row: every valid preview row,
 * `"ok"` or `"duplicate"`, echoes back the `row` and `counterparty_code`/
 * `dedup_hash` its own preview response returned, per the phase spec's
 * "Row shape sent to either endpoint below" section — `resolution` is
 * only present for a row that belonged to a duplicate group.
 */
export type CommitInput = {
  row: ImportRow
  counterpartyCode: string
  dedupHash: string
  resolution?: DuplicateResolution
}

function toCommitRowPayload(input: CommitInput) {
  return {
    ...input.row,
    counterparty_code: input.counterpartyCode,
    dedup_hash: input.dedupHash,
    ...(input.resolution ? { resolution: input.resolution } : {}),
  }
}

export function usePreviewCsvImport() {
  return useMutation({
    mutationFn: async (rows: ImportRow[]) => {
      const response = await apiClient.post<{ rows: PreviewRowDto[] }>(
        "/transactions/import/preview",
        { rows }
      )
      return response.data.rows.map(toPreviewRow)
    },
  })
}

export function useCommitCsvImport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (rows: CommitInput[]) => {
      const response = await apiClient.post<{ imported_count: number }>(
        "/transactions/import/commit",
        { rows: rows.map(toCommitRowPayload) }
      )
      return response.data.imported_count
    },
    onSuccess: () => {
      // Balances changed for every touched account.
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY })
    },
  })
}
