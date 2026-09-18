import type { ReactNode } from "react"

/**
 * Small presentational pieces shared by any form/dialog that needs a
 * terminal-styled eyebrow badge or an inline error/warning banner —
 * originally built for `LoginForm`/`SignupForm` (hence living under
 * `components/auth/` at first), moved here once `DeleteAccountDialog`
 * needed the exact same banner markup, so their class-string chains live
 * in exactly one place instead of being copy-pasted verbatim between
 * callers.
 */

type EyebrowProps = {
  children: ReactNode
}

const Eyebrow = ({ children }: EyebrowProps) => (
  <span className="inline-flex w-fit items-center gap-2 rounded-[2px] border border-border-bright bg-accent-soft px-3 py-1.5 text-[0.7rem] tracking-[0.16em] text-accent-bright uppercase">
    {children}
  </span>
)

type ErrorBannerProps = {
  children: ReactNode
}

const ErrorBanner = ({ children }: ErrorBannerProps) => (
  <div
    role="alert"
    className="flex items-start gap-2 rounded-[3px] border border-danger bg-danger-soft px-4 py-3 text-sm text-danger"
  >
    <span aria-hidden="true">✕</span>
    <span>{children}</span>
  </div>
)

export { Eyebrow, ErrorBanner }
