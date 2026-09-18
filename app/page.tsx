"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { AuthStatus, useAuth } from "@/lib/auth/auth-context"

const Home = () => {
  const { status } = useAuth()
  const router = useRouter()

  // Two branches over a three-value status, used nowhere else in the app
  // — not worth extracting into its own hook/helper for a single call
  // site this small.
  useEffect(() => {
    if (status === AuthStatus.Authenticated) {
      router.replace("/accounts")
      return
    }

    if (status === AuthStatus.Unauthenticated) {
      router.replace("/login")
    }
  }, [status, router])

  return null
}

export default Home
