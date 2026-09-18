"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const NAV_LINKS = [
  { href: "/accounts", label: "Accounts" },
  { href: "/statistics", label: "Statistics" },
  { href: "/transactions", label: "Transactions" },
] as const

function isActiveRoute(pathname: string | null, href: string): boolean {
  if (pathname === null) return false

  return pathname === href || pathname.startsWith(`${href}/`)
}

const Sidebar = () => {
  const pathname = usePathname()

  return (
    <nav aria-label="Primary" className="flex h-full w-60 flex-none flex-col border-r border-sidebar-border bg-sidebar">
      <div className="border-b border-border px-5 py-5 font-heading text-sm text-accent-bright">
        LEDGR_OS
      </div>
      <ul className="flex flex-1 flex-col gap-1 p-3">
        {NAV_LINKS.map((link) => {
          const isActive = isActiveRoute(pathname, link.href)

          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-sm border border-transparent px-3 py-2 text-sm tracking-wide text-sidebar-foreground/70 transition-colors",
                  isActive
                    ? "border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground"
                    : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                {link.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export default Sidebar
