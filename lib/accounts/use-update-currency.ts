"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { apiClient } from "@/lib/api-client"
import { toUser, useAuth } from "@/lib/auth/auth-context"
import { ACCOUNTS_QUERY_KEY } from "@/lib/accounts/use-accounts"

type UserDto = {
  code: string
  first_name: string
  last_name: string
  email: string
  currency: string
}

/**
 * `PATCH /api/v1/users/me`, per the phase spec's route table. Updates
 * `AuthProvider`'s own `user` directly with the response's returned user
 * (see `updateUser` in `lib/auth/auth-context.tsx`) instead of a separate
 * `['me']` query — Phase 4 never introduced one — and invalidates the
 * accounts list, since the cross-account summary's target currency just
 * changed.
 */
export function useUpdateCurrency() {
  const queryClient = useQueryClient()
  const { updateUser } = useAuth()

  return useMutation({
    mutationFn: async (currency: string) => {
      const response = await apiClient.patch<{ user: UserDto }>("/users/me", { currency })
      return toUser(response.data.user)
    },
    onSuccess: (user) => {
      updateUser(user)
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY })
    },
  })
}
