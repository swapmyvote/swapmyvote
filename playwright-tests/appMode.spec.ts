import { expect, test } from "@playwright/test";
import { spaPaths } from "@/lib/spaPaths";
import { setAppMode } from "./support/appMode";
import { signIn, userMenu } from "./support/auth";
import { seedProfileUser } from "./support/seedProfileUser";

// Its own fixture row — this file signs in and reads, but the suffix keeps it
// off the row profile.spec.ts mutates. See seedProfileUser's docstring.
const credentials = seedProfileUser("-appmode");

// One distinguishing, phase-specific phrase per home screen. Deliberately
// static copy: the headings interpolate election data (dateSeasonType,
// eventTitleWithYear) which varies with ELECTION_* env, so matching on those
// would make the suite depend on how the stack was configured.
//
// OpenAndVoting renders OpenPreElections' own HowItWorks component (imported
// straight from OpenPreElections.tsx) plus the same "Swap My Vote can help…"
// tagline paragraph, so neither of those is safe as the "open" signal — both
// are visible on the open-and-voting screen too, and would not catch a
// dispatch regression that rendered OpenAndVoting for mode "open". The h1
// prefixes differ instead: OpenPreElections is "Make your vote count in the
// {dateSeasonType}!", OpenAndVoting is "The {dateSeasonType} is/are here!" —
// verified by rendering all five modes and checking all five signals against
// each (see the fix report), not by grepping source for text uniqueness.
const homeScreens = [
  {
    mode: "closed-warm-up",
    component: "ClosedWarmUp",
    signal: /We aim to open for vote swapping soon/i,
  },
  {
    mode: "open",
    component: "OpenPreElections",
    signal: /Make your vote count in the/i,
  },
  {
    mode: "closed-and-voting",
    component: "ClosedAndVoting",
    signal: /It's time to vote!/i,
  },
  {
    mode: "open-and-voting",
    component: "OpenAndVoting",
    signal: /You still have a bit of time to find a voting partner/i,
  },
  {
    mode: "closed-wind-down",
    component: "ClosedWindDown",
    signal: /Visit SwapYourVote\.org/i,
  },
] as const;

for (const { mode, component, signal } of homeScreens) {
  test(`must render ${component} on the home screen in ${mode}`, async ({
    page,
  }) => {
    await setAppMode(page, mode);
    await expect(page.getByText(signal)).toBeVisible();
  });
}

// closed-warm-up is the one phase where logins are shut: the database is
// expected to be empty and there is nothing worth signing up for yet.
test.describe("closed-warm-up closes logins", () => {
  test("must hide the log in link in the nav", async ({ page }) => {
    await setAppMode(page, "closed-warm-up");
    await expect(
      page.getByText(/We aim to open for vote swapping soon/i),
    ).toBeVisible();

    await expect(
      page.getByRole("link", { name: "Already been here? Log in" }),
    ).toHaveCount(0);
  });

  test("must refuse the login screen", async ({ page }) => {
    await setAppMode(page, "closed-warm-up");
    await page.goto(spaPaths.login);

    await expect(page.getByRole("alert")).toContainText(
      /not open for sign-ups or logins just yet/i,
    );
  });

  test("must refuse POST /api/v1/session, not merely hide it", async ({
    page,
  }) => {
    // The UI guards say in their own docstrings that they are "UX only" — so
    // the point of this spec is the server, reached directly. `page.request`
    // shares the browser context, so it carries the sesame cookie set above.
    await setAppMode(page, "closed-warm-up");

    // ApplicationController declares `protect_from_forgery with: :exception`
    // before `before_action :whats_the_magic_word`, and protect_from_forgery
    // defaults to prepend: false — so it's declaration order, not prepending,
    // that puts verify_authenticity_token ahead of require_logins_open! in
    // the before_action chain. A POST with no token never reaches the guard
    // this test is about; it hits the unverified-request handler instead.
    // Send the real token, the way the SPA does: layouts/spa.html.haml
    // renders csrf_meta_tags, so the document carries <meta name="csrf-token">.
    const csrfToken = await page
      .locator('meta[name="csrf-token"]')
      .getAttribute("content");
    expect(csrfToken).toBeTruthy();

    const response = await page.request.post("/api/v1/session", {
      headers: { "X-CSRF-Token": csrfToken as string },
      data: { email: credentials.email, password: credentials.password },
    });

    expect(response.status()).toBe(403);
    expect(await response.json()).toMatchObject({
      error: { code: "logins_closed" },
    });
  });
});

// closed-and-voting: voting is open, swapping is not.
test.describe("closed-and-voting closes swapping", () => {
  test("must refuse the swap screen", async ({ page }) => {
    await signIn(page, credentials);
    await setAppMode(page, "closed-and-voting");
    await page.goto(spaPaths.swap);

    await expect(page.getByRole("alert")).toContainText(
      /not open for swapping at the moment/i,
    );
  });

  test("must refuse GET /api/v1/swap, not merely hide it", async ({ page }) => {
    await signIn(page, credentials);
    await setAppMode(page, "closed-and-voting");

    const response = await page.request.get("/api/v1/swap");

    expect(response.status()).toBe(403);
    expect(await response.json()).toMatchObject({
      error: { code: "swapping_closed" },
    });
  });
});

// The lever is per-session, and signing in must not wash it out.
test("must keep the session signed in across a phase change", async ({
  page,
}) => {
  await signIn(page, credentials);
  await setAppMode(page, "open-and-voting");

  await expect(userMenu(page)).toBeVisible();
  await expect(
    page.getByText(/You still have a bit of time to find a voting partner/i),
  ).toBeVisible();
});
