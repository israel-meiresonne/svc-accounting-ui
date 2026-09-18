import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { ApiError } from "@/lib/api-client"
import { useAuth } from "@/lib/auth/auth-context"
import LoginForm from "@/components/auth/login-form"

jest.mock("@/lib/auth/auth-context", () => ({
  useAuth: jest.fn(),
}))

const mockedUseAuth = useAuth as jest.Mock

describe("<LoginForm />", () => {
  beforeEach(() => {
    mockedUseAuth.mockReset()
  })

  it("shows an inline validation error and does not call login when submitted empty", async () => {
    const login = jest.fn()
    mockedUseAuth.mockReturnValue({ login })
    const user = userEvent.setup()

    render(<LoginForm />)
    await user.click(screen.getByRole("button", { name: /log_in/i }))

    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument()
    expect(login).not.toHaveBeenCalled()
  })

  it("calls useAuth().login with the entered values on a valid submit", async () => {
    const login = jest.fn().mockResolvedValue(undefined)
    mockedUseAuth.mockReturnValue({ login })
    const user = userEvent.setup()

    render(<LoginForm />)
    await user.type(screen.getByLabelText(/email/i), "priya@nimbus.dev")
    await user.type(screen.getByLabelText(/password/i), "hunter2000")
    await user.click(screen.getByRole("button", { name: /log_in/i }))

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({
        email: "priya@nimbus.dev",
        password: "hunter2000",
      })
    })
  })

  it("shows an error banner when login rejects with invalid_credentials", async () => {
    const login = jest.fn().mockRejectedValue(
      new ApiError(
        { code: "invalid_credentials", message: "Email or password is incorrect", details: {} },
        401
      )
    )
    mockedUseAuth.mockReturnValue({ login })
    const user = userEvent.setup()

    render(<LoginForm />)
    await user.type(screen.getByLabelText(/email/i), "priya@nimbus.dev")
    await user.type(screen.getByLabelText(/password/i), "wrongpass")
    await user.click(screen.getByRole("button", { name: /log_in/i }))

    expect(await screen.findByRole("alert")).toHaveTextContent(/email or password is incorrect/i)
  })
})
