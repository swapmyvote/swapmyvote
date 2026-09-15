import { expect, type Page, test } from "@playwright/test";
import { spaPaths } from "@/lib/spaPaths";
import { signIn, userMenu } from "./support/auth";
import {
  requestPasswordResetToken,
  seedProfileUser,
} from "./support/seedProfileUser";

// Its own suffix keeps this file's fixture row off the ones other specs
// mutate — playwright.config.ts runs fullyParallel, and this spec changes
// the account's password, which no other spec's fixture user should see.
const credentials = seedProfileUser("-password-reset");
const newPassword = "e2e-password-reset-new-password";

async function logOutFromMenu(page: Page) {
  await userMenu(page).click();
  await page.getByRole("button", { name: "Log out" }).click();
  // Navigation.handleLogOut ends with a full page load to the SPA home page —
  // wait for it here rather than immediately navigating again, which would
  // race that in-flight navigation.
  await expect(page).toHaveURL(new RegExp(`${spaPaths.home}$`));
}

test("must reset a forgotten password by email, without confirming the account exists", async ({
  page,
}) => {
  await page.goto(spaPaths.passwordNew);
  await page.getByLabel("Email").fill(credentials.email);
  await page.getByRole("button", { name: "Send reset instructions" }).click();

  // POST /api/v1/password always answers 202 whether or not the address is
  // registered (see the M10 design doc), so the confirmation is worded
  // conditionally — it must never promise mail is on its way to an account
  // that exists. Assert the actual wording, not just that a message appears.
  await expect(
    page.getByText(
      "If that address is registered, we've sent reset instructions to it.",
      { exact: false },
    ),
  ).toBeVisible();

  // The token straight from Devise, not parsed out of a mailer — see
  // requestPasswordResetToken.
  const token = requestPasswordResetToken(credentials.email);

  await page.goto(`${spaPaths.passwordEdit}?reset_password_token=${token}`);
  await page.getByLabel("New password", { exact: true }).fill(newPassword);
  await page.getByLabel("Confirm new password").fill(newPassword);
  await page.getByRole("button", { name: "Change my password" }).click();

  // A successful reset signs the user straight in (Devise's
  // sign_in_after_reset_password default) and the PUT answers with the
  // session payload, so the nav reflects it with no extra navigation.
  await expect(userMenu(page)).toBeVisible();

  await logOutFromMenu(page);

  // The new password logs in...
  await signIn(page, { email: credentials.email, password: newPassword });
  await logOutFromMenu(page);

  // ...and the old one no longer does. This is the assertion that actually
  // proves the reset took — everything above it would also pass if the PUT
  // had silently done nothing but sign the user in on the old password.
  await page.goto(spaPaths.login);
  await page.getByLabel("Email").fill(credentials.email);
  await page.getByLabel("Password").fill(credentials.password);
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page.getByRole("alert")).toContainText(/could not log you in/i);
  await expect(page).toHaveURL(new RegExp(`${spaPaths.login}$`));
  await expect(userMenu(page)).toHaveCount(0);
});
