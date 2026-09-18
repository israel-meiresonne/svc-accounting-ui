import { render, screen } from "@testing-library/react"

import AccountSummary from "@/components/accounts/account-summary"

describe("<AccountSummary />", () => {
  it("renders the formatted total balance", () => {
    render(<AccountSummary summary={{ amount: "16156.66", currency: "eur" }} />)

    expect(screen.getByText("€16,156.66")).toBeInTheDocument()
  })

  it("still renders a real value for the zero-account case, rather than an empty state", () => {
    render(<AccountSummary summary={{ amount: "0", currency: "usd" }} />)

    expect(screen.getByText("$0.00")).toBeInTheDocument()
  })
})
