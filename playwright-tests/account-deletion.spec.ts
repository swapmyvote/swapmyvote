import { expect, test } from "@playwright/test";
import { spaPaths } from "@/lib/spaPaths";
import { signIn, userMenu } from "./support/auth";
import { seedConfirmedSwapPair } from "./support/seedProfileUser";

// seedConfirmedSwapPair is synchronous — it shells out to `bin/rails runner`
// and returns the pair directly, not a promise. Its own suffix keeps this
// file's rows off the ones other specs mutate, since playwright.config.ts
// runs fullyParallel.
const { chooser, chosen } = seedConfirmedSwapPair("-account-deletion");

test("must delete the account, sign the user out, and cancel the partner's swap", async ({
  page,
}) => {
  await signIn(page, chooser);

  await page.goto(spaPaths.confirmAccountDeletion);
  await page.getByRole("button", { name: "Yes, delete my account" }).click();

  await expect(page).toHaveURL(new RegExp(`${spaPaths.accountDeleted}$`));
  await expect(
    page.getByText(
      "Your account is now deleted, and your details have been removed from our system.",
      { exact: false },
    ),
  ).toBeVisible();

  // useDeleteAccount primes the session cache with the signed-out payload
  // DELETE /api/v1/user answers with, rather than reloading the page — so the
  // nav's signed-out state here proves that actually happened, not just that
  // a fresh page load re-read a session that was never touched.
  await expect(userMenu(page)).toHaveCount(0);

  // The swap teardown is the models' work — User before_destroy :clear_swap
  // destroys the chooser's outgoing_swap, which is the same row as the
  // partner's incoming_swap — not the controller's. Sign in as the partner
  // and confirm the swap is really gone: Swap.tsx redirects a user with a
  // live swap straight to the dashboard, so staying on /app/swap and seeing
  // the "no swap yet" screen is only possible once that row is destroyed.
  await signIn(page, chosen);
  await page.goto(spaPaths.swap);
  await expect(
    page.getByRole("heading", {
      name: "We’re looking for a voting partner for you",
    }),
  ).toBeVisible();
});
