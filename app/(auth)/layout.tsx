import type { ReactNode } from "react"

import AuthShell from "@/components/auth/auth-shell"

type AuthLayoutProps = {
  children: ReactNode
}

const AuthLayout = ({ children }: AuthLayoutProps) => {
  return <AuthShell>{children}</AuthShell>
}

export default AuthLayout
