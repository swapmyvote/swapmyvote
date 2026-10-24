import { expect, test } from "@playwright/test";
import { spaPaths } from "@/lib/spaPaths";
import { signIn } from "./support/auth";
import { seedBeforeAll } from "./support/seedProfileUser";

const seeds = seedBeforeAll();

// Its own row — this file only reads, but the suffix keeps it off the row
// profile.spec.ts mutates. See seedBeforeAll's profileUser.
const credentials = seeds.profileUser("-review");
const credentialsWithoutConstituency = seeds.userWithoutConstituency("-review");

test.describe("/app/review", () => {
  test("must show the polls for the offered vote", async ({ page }) => {
    await signIn(page, credentials);
    await page.goto(spaPaths.review);

    await expect(
      page.getByRole("heading", { name: "Your offered vote" }),
    ).toBeVisible();
    // profileUser puts this user in Woking, with Labour as the offered
    // vote and polls for Woking seeded alongside.
    await expect(page.getByText(/Predicted results for Woking/i)).toBeVisible();
    // profileUser keeps Labour the leading party in Woking whatever else is
    // in the database, with marginal_score 3010 (above the 1000 marginal
    // threshold), so this is always the "safe win" reading.
    await expect(
      page.getByText(
        "Looks like your vote may be supporting a safe win for Labour who are currently leading by 30% in the polls for Woking, so it's less likely that people supporting Labour will want to swap with you.",
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
