import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { ApiError } from "@/lib/api-client"
import { useAuth } from "@/lib/auth/auth-context"
import SignupForm from "@/components/auth/signup-form"

jest.mock("@/lib/auth/auth-context", () => ({
  useAuth: jest.fn(),
}))

const mockedUseAuth = useAuth as jest.Mock

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/first name/i), "Priya")
  await user.type(screen.getByLabelText(/last name/i), "Nair")
  await user.type(screen.getByLabelText(/email/i), "priya@nimbus.dev")
  await user.type(screen.getByLabelText(/^password$/i), "hunter2000")
  await user.type(screen.getByLabelText(/confirm password/i), "hunter2000")
}

describe("<SignupForm />", () => {
  beforeEach(() => {
    mockedUseAuth.mockReset()
  })

  it("shows an inline error and does not call signup when the passwords don't match", async () => {
    const signup = jest.fn()
    mockedUseAuth.mockReturnValue({ signup })
    const user = userEvent.setup()

    render(<SignupForm />)
    await user.type(screen.getByLabelText(/first name/i), "Priya")
    await user.type(screen.getByLabelText(/last name/i), "Nair")
    await user.type(screen.getByLabelText(/email/i), "priya@nimbus.dev")
    await user.type(screen.getByLabelText(/^password$/i), "hunter2000")
    await user.type(screen.getByLabelText(/confirm password/i), "different")
    await user.click(screen.getByRole("button", { name: /create_account/i }))

    expect(await screen.findByText(/passwords don't match/i)).toBeInTheDocument()
    expect(signup).not.toHaveBeenCalled()
  })

  it("calls useAuth().signup with the entered values, defaulting currency to usd", async () => {
    const signup = jest.fn().mockResolvedValue(undefined)
    mockedUseAuth.mockReturnValue({ signup })
    const user = userEvent.setup()

    render(<SignupForm />)
    await fillRequiredFields(user)
    await user.click(screen.getByRole("button", { name: /create_account/i }))

    await waitFor(() => {
      expect(signup).toHaveBeenCalledWith({
        firstName: "Priya",
        lastName: "Nair",
        email: "priya@nimbus.dev",
        password: "hunter2000",
        passwordConfirmation: "hunter2000",
        currency: "usd",
      })
    })
  })

  it("shows a banner and an inline field error when signup rejects with a duplicate-email validation failure", async () => {
    const signup = jest.fn().mockRejectedValue(
      new ApiError(
        {
          code: "validation_failed",
          message: "Validation failed: Email has already been taken",
          details: { email: ["has already been taken"] },
        },
        422
      )
    )
    mockedUseAuth.mockReturnValue({ signup })
    const user = userEvent.setup()

    render(<SignupForm />)
    await fillRequiredFields(user)
    await user.click(screen.getByRole("button", { name: /create_account/i }))

    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't create your account/i)
    expect(await screen.findByText(/has already been taken/i)).toBeInTheDocument()
  })
})
