import type { ReactNode } from "react"

import Sidebar from "@/components/layout/sidebar"

type AppShellProps = {
  children: ReactNode
}

const AppShell = ({ children }: AppShellProps) => {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  )
}

export default AppShell
