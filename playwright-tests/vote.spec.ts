import { expect, test } from "@playwright/test";
import { spaPaths } from "@/lib/spaPaths";
import { signIn } from "./support/auth";
import {
  seedConfirmedSwapPair,
  seedProfileUser,
} from "./support/seedProfileUser";

// Serial for the same reason swap.spec.ts is: both tests below act on the one
// shared pair, and the first mutates has_voted.
test.describe.configure({ mode: "serial" });

const pair = seedConfirmedSwapPair("-vote");
const noSwapUser = seedProfileUser("-vote-noswap");

test.describe("/app/vote", () => {
  test("records a vote and then offers sharing", async ({ page }) => {
    await signIn(page, pair.chooser);
    await page.goto(spaPaths.vote);

    const voted = page.getByRole("button", { name: /Yes, I've voted/ });
    await expect(voted).toBeVisible();
    await voted.click();

    await expect(page.getByText(/Thanks!/)).toBeVisible();
    // Two elements can carry this exact accessible name: SocialShare's own
    // dedicated Bluesky button, and — since this Chromium has no
    // navigator.share, so ShareButton renders its fallback row too — the
    // react-share BlueskyShareButton in that row (see SocialShare.tsx's
    // comment on the deliberate WhatsApp/Bluesky duplication). `.first()`
    // takes the dedicated one, which renders first in DOM order.
    await expect(
      page.getByRole("button", { name: /Share on Bluesky/ }).first(),
    ).toBeVisible();
    await expect(voted).toBeHidden();
  });

  test("refuses a user without a confirmed swap", async ({ page }) => {
    await signIn(page, noSwapUser);

    await page.goto(spaPaths.vote);

    // Vote redirects to Dashboard, which then redirects again on its own —
    // this fixture user has no swap at all, so Dashboard's own "no swap"
    // guard sends them straight on to Swap. Both hops are correct behaviour;
    // this test only cares that /app/vote itself refuses, so assert the
    // final URL it actually settles on rather than the intermediate one.
    await expect(page).toHaveURL(new RegExp(`${spaPaths.swap}$`));
  });
});
