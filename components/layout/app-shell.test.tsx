import { render, screen } from "@testing-library/react"

import AppShell from "@/components/layout/app-shell"

jest.mock("next/navigation", () => ({
  usePathname: () => "/statistics",
}))

describe("<AppShell />", () => {
  it("renders all three primary nav links in the sidebar", () => {
    render(<AppShell>content</AppShell>)

    expect(screen.getByRole("link", { name: "Accounts" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Statistics" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Transactions" })).toBeInTheDocument()
  })

  it("highlights only the link matching the mocked route", () => {
    render(<AppShell>content</AppShell>)

    expect(screen.getByRole("link", { name: "Statistics" })).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("link", { name: "Accounts" })).not.toHaveAttribute("aria-current")
    expect(screen.getByRole("link", { name: "Transactions" })).not.toHaveAttribute("aria-current")
  })

  it("renders children inside the main content region", () => {
    render(
      <AppShell>
        <p>Page content</p>
      </AppShell>
    )

    expect(screen.getByText("Page content")).toBeInTheDocument()
  })
})
