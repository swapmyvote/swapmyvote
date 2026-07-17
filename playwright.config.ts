import { defineConfig, devices } from "@playwright/test";

// E2E + accessibility (axe) tests run against the running Rails + Vite dev
// stack. Start the stack yourself (`foreman start -f Procfile.dev`, or the
// two dev servers) and Playwright will reuse it. The full swap flow lands in
// M7; M1 adds the first real page-level specs.
export default defineConfig({
  testDir: "./playwright-tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "foreman start -f Procfile.dev",
    url: "http://localhost:3000/app/ping",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
