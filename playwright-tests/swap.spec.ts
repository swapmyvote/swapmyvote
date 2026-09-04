import { expect, type Page, test } from "@playwright/test";
import { spaPaths } from "@/lib/spaPaths";
import { signIn } from "./support/auth";
import { seedSwapPair } from "./support/seedProfileUser";

// Serial: the two accounts are one shared swap, and the tests below walk it
// through its states in order. Running them in parallel would race on the same
// two rows.
test.describe.configure({ mode: "serial" });

const { chooser, chosen } = seedSwapPair("-e2e");

// User#redacted_name keeps the first name and the first letter of the second
// (NameRedactor) plus the " (test user)" suffix — "E2E Chooser" and
// "E2E Chosen" both redact to the same string, which is fine here since the
// two are never shown on the same screen.
const redactedPartnerName = "E2E C (test user)";
const chooserFullName = "E2E Chooser (test user)";

// Everything a logged-in user can do lives behind the avatar menu, so log out
// is only reachable by opening it first — see auth.spec.ts.
function userMenu(page: Page, name: string) {
  return page.getByRole("button", { name: `${name} (test user)` });
}

async function logOutFromMenu(page: Page, name: string) {
  await userMenu(page, name).click();
  await page.getByRole("button", { name: "Log out" }).click();
  // Navigation.handleLogOut ends with a full page load to the legacy home
  // page. Waiting for it here, rather than immediately navigating again,
  // avoids racing that in-flight navigation with the next page.goto (which
  // Chromium answers with net::ERR_ABORTED).
  await expect(page).toHaveURL(/\/$/);
}

test.describe("the swap flow", () => {
  test("offers a swap, confirms it from the other side, and shows both dashboards", async ({
    page,
  }) => {
    await signIn(page, chooser);

    await page.goto(spaPaths.swap);
    await expect(
      page.getByRole("heading", {
        name: "Who would you like to swap your vote with?",
      }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Offer to swap" }).first().click();
    await expect(page).toHaveURL(new RegExp(`${spaPaths.swap}/new/\\d+`));

    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: /^Swap with / }).click();

    await expect(page).toHaveURL(new RegExp(`${spaPaths.dashboard}$`));
    // Redacted: the chooser has only offered, not been confirmed, so the
    // partner's full name has not been shared yet.
    await expect(
      page.getByRole("heading", {
        name: `You've asked to swap your vote with ${redactedPartnerName}!`,
      }),
    ).toBeVisible();

    // The partner's side.
    await logOutFromMenu(page, "E2E Chooser");
    await signIn(page, chosen);
    await page.goto(spaPaths.dashboard);

    // Still redacted here too — this account has not confirmed yet either.
    await expect(
      page.getByRole("heading", {
        name: `${redactedPartnerName} would like to swap their vote with you!`,
      }),
    ).toBeVisible();

    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: /^Swap with / }).click();

    // Redaction ends at confirmation: the real name appears here, and nowhere
    // earlier in this test.
    await expect(
      page.getByRole("heading", {
        name: `You've swapped your vote with ${chooserFullName}!`,
      }),
    ).toBeVisible();
  });

  test("rejects a swap from the chosen side", async ({ page }) => {
    // A fresh offer, since the previous test confirmed the last one.
    const pair = seedSwapPair("-e2e");

    await signIn(page, pair.chooser);
    await page.goto(spaPaths.swap);
    await page.getByRole("link", { name: "Offer to swap" }).first().click();
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: /^Swap with / }).click();
    await expect(page).toHaveURL(new RegExp(`${spaPaths.dashboard}$`));

    await logOutFromMenu(page, "E2E Chooser");
    await signIn(page, pair.chosen);
    await page.goto(spaPaths.dashboard);

    // Only the chosen side can reject — this is that side.
    await page
      .getByRole("button", { name: "I'd prefer to swap with someone else" })
      .click();
    await expect(
      page.getByText(/Are you sure you want to reject/),
    ).toBeVisible();
    await page.getByRole("button", { name: "Reject" }).click();

    // With no swap left, the dashboard sends them back to find another.
    await expect(page).toHaveURL(new RegExp(`${spaPaths.swap}$`));
  });
});
