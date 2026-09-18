import type { ReactNode } from "react"

/**
 * Small presentational pieces shared by `LoginForm` and `SignupForm`
 * (the `$ ./*.sh` eyebrow badge and the error banner), extracted here so
 * their class-string chains live in exactly one place instead of being
 * copy-pasted verbatim between the two forms.
 */

type AuthEyebrowProps = {
  children: ReactNode
}

const AuthEyebrow = ({ children }: AuthEyebrowProps) => (
  <span className="inline-flex w-fit items-center gap-2 rounded-[2px] border border-border-bright bg-accent-soft px-3 py-1.5 text-[0.7rem] tracking-[0.16em] text-accent-bright uppercase">
    {children}
  </span>
)

type AuthErrorBannerProps = {
  children: ReactNode
}

const AuthErrorBanner = ({ children }: AuthErrorBannerProps) => (
  <div
    role="alert"
    className="flex items-start gap-2 rounded-[3px] border border-danger bg-danger-soft px-4 py-3 text-sm text-danger"
  >
    <span aria-hidden="true">✕</span>
    <span>{children}</span>
  </div>
)

export { AuthEyebrow, AuthErrorBanner }
