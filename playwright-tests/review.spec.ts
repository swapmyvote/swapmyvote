import { expect, test } from "@playwright/test";
import { spaPaths } from "@/lib/spaPaths";
import { signIn } from "./support/auth";
import {
  seedProfileUser,
  seedUserWithoutConstituency,
} from "./support/seedProfileUser";

// Its own row — this file only reads, but the suffix keeps it off the row
// profile.spec.ts mutates. See seedProfileUser's docstring.
const credentials = seedProfileUser("-review");
const credentialsWithoutConstituency = seedUserWithoutConstituency();

test.describe("/app/review", () => {
  test("must show the polls for the offered vote", async ({ page }) => {
    await signIn(page, credentials);
    await page.goto(spaPaths.review);

    await expect(
      page.getByRole("heading", { name: "Your offered vote" }),
    ).toBeVisible();
    // seedProfileUser puts this user in Woking, with Labour as the offered
    // vote and polls for Woking seeded alongside.
    await expect(page.getByText(/Predicted results for Woking/i)).toBeVisible();
    // The brief expects "safe-win" (Woking seeded Labour 4210 / Green 1200,
    // this user offering the leading party). A real run instead showed
    // "trailing" -- because this dev database is shared across every spec
    // file that seeds Woking fixtures, and Poll#signed_marginal_score sums
    // *all* Woking polls, not just this fixture's own Labour/Green pair.
    // Other files seed their own "Labour-<suffix>" parties at the same 4210
    // votes (seedSwapPair, seedConfirmedSwapPair), and whichever of those
    // happen to already exist in the database changes this poll's computed
    // sign -- so "leading" vs "trailing" is not something one spec file run
    // can pin down; it depends on suite composition and history, not on this
    // fixture's own inputs.
    //
    // What *is* stable regardless of that: marginal_score itself is a column
    // this fixture sets explicitly (3010, above the 1000 marginalThreshold),
    // so the "could make a difference" branch can never fire here, the
    // formatted percentage is always "30%" (formatPercent reads the stored
    // column, not the dynamic sign), and both remaining branches
    // (safe-win / trailing) end in the exact same sentence tail. Assert that
    // shared, specific text -- narrower than the brief's bare /Labour/, but
    // not the full sentence, since which of the two openings appears is
    // genuinely not deterministic here.
    await expect(
      page.getByText(/by 30% in the polls for Woking/),
    ).toBeVisible();
    await expect(
      page.getByText(
        /so it's less likely that people supporting Labour will want to swap with you\.$/,
      ),
    ).toBeVisible();
  });

  test("must offer a way back to the profile and a way on", async ({
    page,
  }) => {
    await signIn(page, credentials);
    await page.goto(spaPaths.review);

    // Confirmed against a real run: ProfileReview renders these as
    // react-router <Link>s, which render a plain <a href>, so
    // toHaveAttribute holds rather than needing a click-and-check-URL dance.
    await expect(page.getByRole("link", { name: "Change" })).toHaveAttribute(
      "href",
      spaPaths.profile,
    );
    await expect(page.getByRole("link", { name: "Proceed" })).toHaveAttribute(
      "href",
      spaPaths.dashboard,
    );
  });

  test("must go back to the profile from Change", async ({ page }) => {
    await signIn(page, credentials);
    await page.goto(spaPaths.review);

    await page.getByRole("link", { name: "Change" }).click();

    await expect(page).toHaveURL(new RegExp(`${spaPaths.profile}$`));
  });

  test("must send an incomplete profile back to edit it", async ({ page }) => {
    // No constituency, so there is nothing to interpret polls against.
    await signIn(page, credentialsWithoutConstituency);
    await page.goto(spaPaths.review);

    // Unlike /app/home, nothing else on this page renders role="alert" (the
    // cookie-consent notice that makes a bare getByRole("alert") ambiguous
    // there lives only inside the home-page NewsSignUp variants, never in
    // Layout/Footer), and ProfileReview's own guard is the only Alert this
    // screen ever renders — so a bare getByRole("alert") is unambiguous here,
    // even though the alert itself is variant="warning" rather than
    // variant="danger" (react-bootstrap's Alert always sets role="alert"
    // regardless of variant, so home.spec.ts's `.alert-danger` filter would
    // not match this one).
    await expect(page.getByRole("alert")).toContainText(
      /you shouldn't be here/i,
    );
    await expect(
      page.getByRole("link", { name: "Edit Profile" }),
    ).toBeVisible();
  });

  test("must refuse a logged-out visitor", async ({ page }) => {
    await page.goto(spaPaths.review);

    // RequireLogin does not redirect — it renders an inline warning Alert in
    // place of the page and leaves the URL exactly where it was. So the
    // brief's `not.toHaveURL(/\/app\/review$/)` would actually fail (the URL
    // never changes) and, more importantly, is a weak assertion that would
    // also pass on an unrelated failure (a blank page, say). Assert the real,
    // specific behaviour instead: the inline message and its link to log in.
    await expect(page).toHaveURL(new RegExp(`${spaPaths.review}$`));
    const alert = page.getByRole("alert");
    await expect(alert).toContainText(
      /you need to be logged in to see this page/i,
    );
    // Scoped to the alert: the nav also has an "Already been here? Log in"
    // link, which a page-wide getByRole("link", { name: "Log in" }) matches
    // too (substring name matching), producing a strict-mode violation.
    await expect(alert.getByRole("link", { name: "Log in" })).toHaveAttribute(
      "href",
      spaPaths.login,
    );
  });
});
