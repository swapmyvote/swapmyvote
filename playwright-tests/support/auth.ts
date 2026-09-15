import { expect, type Locator, type Page } from "@playwright/test";
import { spaPaths } from "@/lib/spaPaths";
import type { TestCredentials } from "./seedProfileUser";

/**
 * The nav's logged-in signal. Everything a logged-in user can do lives behind
 * this dropdown toggle, and log out is only reachable through it.
 *
 * Located by id, not by accessible name: the toggle is labelled with the
 * user's own name, which differs per fixture (and `User#name` appends
 * " (test user)" for @example.com addresses), so a name-based locator would
 * have to be threaded through every caller. `id="user-menu"` is set
 * deliberately in Navigation.tsx.
 */
export const userMenu = (page: Page): Locator => page.locator("#user-menu");

/**
 * Signs in through the React login form.
 *
 * This used to drive the legacy Devise form at /users/sign_in, because until
 * M5 (#1053) that was the only way in. Keeping it there meant every signed-in
 * spec entered the SPA through HAML, and left one hardcoded legacy path that
 * would break at cutover while the rest of the suite flips with a single
 * spaPaths edit. See swapmyvote/swapmyvote#1079.
 */
export async function signIn(
  page: Page,
  { email, password }: TestCredentials,
): Promise<void> {
  await page.goto(spaPaths.login);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();

  // "no longer on the login URL" alone would also pass on a 500 or an
  // unrelated redirect — assert a real signed-in signal instead, so a broken
  // login fails loudly here rather than as a confusing timeout in whichever
  // test called this.
  await expect(userMenu(page)).toBeVisible();
  await expect(page).not.toHaveURL(new RegExp(`${spaPaths.login}$`));
}
