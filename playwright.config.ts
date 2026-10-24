import { defineConfig, devices } from "@playwright/test";

// E2E + accessibility (axe) tests run against the Rails + Vite dev stack.
// `webServer` below boots it, but a stack you already have running is reused,
// so the usual local loop (`foreman start -f Procfile.dev` in one terminal,
// `yarn e2e` in another) still works. Foreman must be on PATH — it is
// installed as a standalone gem, not through the Gemfile.
//
// The full swap flow lands in M7.
export default defineConfig({
  testDir: "./playwright-tests",
  // Spec files run in parallel, but each file's tests stay in one worker, in
  // order. Fixtures are seeded per file, in a file-level beforeAll
  // (seedBeforeAll in support/seedProfileUser.ts), and every file's fixture
  // rows are its own. With fullyParallel, a file's tests could be split
  // across workers, and each of those workers would run that beforeAll
  // again, re-seeding rows another worker's test was in the middle of using.
  fullyParallel: false,
  globalSetup: "./playwright-tests/support/globalSetup.ts",
  workers: 4,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // CI also writes the HTML report so the workflow can upload it as an
  // artifact; `open: "never"` stops Playwright trying to launch a browser on
  // the runner when a test fails.
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : [["list"]],
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
  // E2E_BASE_URL means "a stack is already running, here" — so don't boot one.
  // Without this, the suite still waits on port 3000 even when pointed
  // elsewhere, which hangs whenever something else holds that port: another
  // checkout's server, or a worktree running on its own ports.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "foreman start -f Procfile.dev",
        url: "http://localhost:3000/app/ping",
        // Locally, reuse whatever stack the developer already has running; on
        // CI there is never one to reuse, and reusing would mask a stack that
        // failed to boot.
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
