import type { Config } from "jest"
import nextJest from "next/jest.js"

const createJestConfig = nextJest({ dir: "./" })

const config: Config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/", "<rootDir>/e2e/"],
  // `next/jest`'s own config only rewrites `@/...` imports through its SWC
  // transform, which regular `import` statements go through but a
  // `jest.mock("@/...")` call's literal string argument does not — Jest's
  // resolver sees that raw string directly, so it needs its own mapping to
  // the same `tsconfig.json` `paths` alias.
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
}

export default createJestConfig(config)
