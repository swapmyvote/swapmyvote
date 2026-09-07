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
  fullyParallel: true,
  // One worker, deliberately. The specs drive the development stack, which is
  // SQLite (see .github/workflows/playwright.yml), and several specs seed and
  // mutate shared fixture rows through `bin/rails runner` while the running
  // server is also writing.
  //
  // Rails 7.2 made this visible as `SQLite3::BusyException: database is
  // locked` in the seeds. Rails 8.1 fixes that specific cause -- its SQLite
  // adapter begins transactions as IMMEDIATE -- and the BusyExceptions are
  // gone. What remains is inside profile.spec.ts: seedProfileUser() is called
  // once at module scope, and both tests in its "profile screen" block mutate
  // that single user -- one changes the offered party, the other the email --
  // so with more than one worker they race and one still fails about a third
  // of the time. Fixing that means giving those tests their own fixture rows;
  // until then one worker costs ~30s on a ~1 minute suite and is reliably
  // green.
  workers: 1,
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
