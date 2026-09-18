import type { ReactNode } from "react"

import AppShell from "@/components/layout/app-shell"
import AuthGuard from "@/lib/auth/auth-guard"

type AppLayoutProps = {
  children: ReactNode
}

const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  )
}

export default AppLayout
