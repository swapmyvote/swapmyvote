import { execFileSync } from "node:child_process";
import { expect, type Page, test } from "@playwright/test";
import { spaPaths } from "@/lib/spaPaths";

// See seedProfileUser.ts: a stale Spring preloader leaves `runner` hanging
// with no output, which stalls the suite before a test starts.
const railsEnv = { ...process.env, DISABLE_SPRING: "1" };

// Sign-up creates the account, so unlike every other spec this one has to
// start from the account NOT existing. Delete it first, and give it an address
// no other spec touches.
const email = "e2e-auth@example.com";
const password = "e2e-auth-password";
const name = "E2E Auth";

// User#name appends " (test user)" for @example.com addresses, and that is
// what the nav renders — so it is also the accessible name of the menu toggle.
const menuLabel = `${name} (test user)`;

// Everything a logged-in user can do lives behind the avatar menu, so the
// toggle is the nav's logged-in signal and log out is only reachable through
// it.
const userMenu = (page: Page) => page.getByRole("button", { name: menuLabel });

async function logOutFromMenu(page: Page) {
  await userMenu(page).click();
  await page.getByRole("button", { name: "Log out" }).click();
}

test.beforeEach(() => {
  execFileSync(
    "bin/rails",
    [
      "runner",
      `User.where(email: "${email}").destroy_all
       OnsConstituency.find_or_create_by!(ons_id: "E14001063") { |c| c.name = "Woking" }`,
    ],
    { stdio: "inherit", env: railsEnv },
  );
});

// Serial: the three steps are one journey through a single account, and
// fullyParallel would otherwise run them against each other's fixture state.
test.describe.configure({ mode: "serial" });

test("must sign up, then log out, then log back in", async ({ page }) => {
  await page.goto(spaPaths.signup);

  // Exact: true because the newsletter opt-in checkbox's accessible name
  // ("Opt-in to Forward Democracy email updates") and the "Confirm password"
  // field's accessible name both contain these labels as substrings, and
  // Playwright's getByLabel matches substrings by default.
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page
    .getByRole("checkbox", { name: /processing my personal data/i })
    .check();
  await page.getByRole("button", { name: /confirm/i }).click();

  // A brand new account has no constituency, so postAuthPath sends it here.
  await expect(page).toHaveURL(new RegExp(`${spaPaths.constituency}$`));
  await expect(
    page.getByRole("combobox", { name: "My constituency is" }),
  ).toBeVisible();
  // The nav bar reflects the new session, not just the page.
  await expect(userMenu(page)).toBeVisible();

  await logOutFromMenu(page);

  // Log out deliberately ends on the legacy HAML home page. A mere URL match
  // would still pass if DELETE /api/v1/session silently failed server-side —
  // Navigation.handleLogOut swallows that error and navigates anyway — so
  // assert the real signal instead: the home page's layout renders
  // layouts/_login (this link) when logged out and layouts/_current_user (a
  // "Log out" link) when logged in, never both.
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("link", { name: "Already been here? Log in" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Log out" })).toHaveCount(0);

  await page.goto(spaPaths.login);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page).toHaveURL(new RegExp(`${spaPaths.constituency}$`));
  await expect(userMenu(page)).toBeVisible();
});

test("must refuse a wrong password without saying which field was wrong", async ({
  page,
}) => {
  execFileSync(
    "bin/rails",
    [
      "runner",
      `user = User.find_or_initialize_by(email: "${email}")
       user.password = "${password}"
       user.name = "E2E Auth"
       user.save!`,
    ],
    { stdio: "inherit", env: railsEnv },
  );

  await page.goto(spaPaths.login);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("not-the-password");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page.getByRole("alert")).toContainText(/could not log you in/i);
  await expect(page).toHaveURL(new RegExp(`${spaPaths.login}$`));
});
