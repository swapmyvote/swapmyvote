import { expect, type Page } from "@playwright/test";
import type { TestCredentials } from "./seedProfileUser";

/**
 * Signs in through the legacy Devise form. Auth is M5: until then this is the
 * only way in, and it is also the real thing a user does today.
 */
export async function signIn(
  page: Page,
  { email, password }: TestCredentials,
): Promise<void> {
  await page.goto("/users/sign_in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).not.toHaveURL(/sign_in/);
}
