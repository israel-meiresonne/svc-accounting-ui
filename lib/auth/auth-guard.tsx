"use client"

import { useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"

import { AuthStatus, useAuth } from "@/lib/auth/auth-context"

type AuthGuardProps = {
  children: ReactNode
}

const AuthGuard = ({ children }: AuthGuardProps) => {
  const { status } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (status === AuthStatus.Unauthenticated) {
      router.replace("/login")
    }
  }, [status, router])

  if (status !== AuthStatus.Authenticated) {
    return null
  }

  return <>{children}</>
}

export default AuthGuard
