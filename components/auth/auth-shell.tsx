import type { ReactNode } from "react"

type AuthShellProps = {
  children: ReactNode
}

/**
 * Centered-card layout matching the mockup's `.auth-shell`/`.auth-card`
 * (`1-specifications/mockups/login.html`, `signup.html`). Pure
 * presentation: the logo/eyebrow/heading/form/footer content is
 * page-specific and lives in `LoginForm`/`SignupForm` instead.
 */
const AuthShell = ({ children }: AuthShellProps) => {
  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="flex w-full max-w-md flex-col gap-6 rounded-[4px] border border-border-bright bg-card p-9 shadow-[0_0_40px_var(--accent-soft)]">
        <div className="text-center font-heading text-lg text-accent-bright">
          LEDGR_OS
          <span
            aria-hidden="true"
            className="ml-1 inline-block w-2 animate-pulse bg-accent-bright align-middle"
          >
            &nbsp;
          </span>
        </div>
        {children}
      </div>
    </div>
  )
}

export default AuthShell
