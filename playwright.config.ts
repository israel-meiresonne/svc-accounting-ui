import { defineConfig, devices } from "@playwright/test"

// Single source of truth for both apps' ports. Each app also reads its own
// half of this from its own env file (PORT here, FRONTEND_PORT in
// svc-accounting's .env) — keep those defaults in sync with these.
const FRONTEND_PORT = process.env.PORT ?? 3001
const BACKEND_PORT = process.env.BACKEND_PORT ?? 3000

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: `npm run dev -- -p ${FRONTEND_PORT}`,
      url: `http://localhost:${FRONTEND_PORT}`,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `mise exec -- bin/rails server -p ${BACKEND_PORT}`,
      cwd: "../svc-accounting",
      url: `http://localhost:${BACKEND_PORT}/up`,
      reuseExistingServer: !process.env.CI,
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
})
