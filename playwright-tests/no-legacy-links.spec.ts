import { expect, type Locator, type Page, test } from "@playwright/test";
import { spaPaths } from "@/lib/spaPaths";
import { signIn } from "./support/auth";
import {
  seedConfirmedSwapPair,
  seedProfileUser,
} from "./support/seedProfileUser";

// Every canonical path a ported screen replaced. A link to one of these from
// inside the SPA drops the user into the Bootstrap 4 HAML site with no way
// back — the bug M6, M8 and M9 each shipped believing they had just fixed,
// every time because the component tests asserted the buggy href, so the suite
// agreed with the bug.
//
// Derived from config/routes.rb: for each `get "app/…", to: "spa#index"` entry
// in the SPA allow-list, the canonical route its comment names as "keeps
// serving HAML until cutover". Add to this list when a screen is ported, not
// when a link is found.
//
// `/` is deliberately absent. The SPA home is spaPaths.home, and a link to `/`
// is the legacy home — which log out uses on purpose (Navigation.tsx), because
// signing out has to leave the React session behind.
const replacedByTheSpa = [
  // M1/M9 static pages.
  "/about",
  "/contact",
  "/terms",
  "/cookies",
  "/faq",
  "/api",
  // M5 auth, M10 password reset.
  "/users/sign_in",
  "/users/sign_up",
  "/users/password/new",
  "/users/password/edit",
  // M10 account deletion.
  "/confirm_account_deletion",
  "/account_deleted",
  // M4 profile screens. `/user` is the dashboard (users#show) and `/user/edit`
  // the profile form.
  "/user",
  "/user/edit",
  "/user/constituency",
  "/user/review",
  // M6 mobile verification.
  "/mobile_phone/verify_create",
  "/mobile_phone/verify_token",
  // M7 swap flow, M8 vote and share.
  "/user/swap",
  "/user/swap/new",
  "/user/share",
  "/user/vote",
];

function isLegacy(href: string): boolean {
  // Query and fragment are noise here — `/faq#trust` is as much a trip out of
  // the SPA as `/faq`. A bare `#anchor` collapses to "", and so does "/", so
  // neither can match.
  const path = href.split("?")[0].split("#")[0].replace(/\/$/, "");
  return replacedByTheSpa.includes(path);
}

/**
 * Every `href` in the document, including the nav and footer — which is where
 * two of the three links this test was written for actually lived.
 */
async function hrefsOn(page: Page): Promise<string[]> {
  return page
    .locator("a[href]")
    .evaluateAll((links) =>
      links.map((link) => link.getAttribute("href") ?? ""),
    );
}

/**
 * Waits for the screen's real content before reading its links.
 *
 * "main is non-empty" is not enough on its own for the screens that fetch
 * first: several render a Spinner *inside* `<main>`, which satisfies it at the
 * first paint Playwright can observe. Crawling that would scan a page whose
 * links have not rendered yet and pass having checked nothing — the same
 * false-confidence failure mode this test exists to end. So the dynamic
 * screens gate on a locator that only their loaded state produces.
 */
async function expectNoLegacyLinks(
  page: Page,
  path: string,
  ready?: (page: Page) => Locator,
): Promise<void> {
  await page.goto(path);
  if (ready) {
    await expect(ready(page)).toBeVisible();
  } else {
    await expect(page.getByRole("main")).not.toBeEmpty();
  }

  expect(
    await hrefsOn(page).then((hrefs) => hrefs.filter(isLegacy)),
    path,
  ).toEqual([]);
}

const loggedOutPages: {
  name: string;
  path: string;
  ready?: (page: Page) => Locator;
}[] = [
  {
    name: "home",
    path: spaPaths.home,
    ready: (page) => page.getByRole("button", { name: "Search" }),
  },
  { name: "about", path: spaPaths.about },
  { name: "contact", path: spaPaths.contact },
  { name: "terms", path: spaPaths.terms },
  { name: "cookie policy", path: spaPaths.cookies },
  { name: "FAQ", path: spaPaths.faq },
  {
    name: "API docs",
    path: spaPaths.api,
    ready: (page) =>
      page.getByRole("heading", { name: "Swap My Vote API", level: 1 }),
  },
  {
    name: "login",
    path: spaPaths.login,
    ready: (page) => page.getByRole("button", { name: "Log in" }),
  },
  { name: "sign-up", path: spaPaths.signup },
  {
    name: "password reset request",
    path: spaPaths.passwordNew,
    ready: (page) =>
      page.getByRole("heading", { name: "Reset password", level: 1 }),
  },
  {
    // With no `reset_password_token` in the query string this renders its
    // "that link no longer works" state, which carries a link of its own —
    // exactly the kind of secondary link that gets forgotten.
    name: "password reset form",
    path: spaPaths.passwordEdit,
    ready: (page) => page.getByRole("link", { name: /request a new reset/i }),
  },
  { name: "account deleted", path: spaPaths.accountDeleted },
];

for (const { name, path, ready } of loggedOutPages) {
  test(`must not link out to a replaced HAML path from the ${name} screen`, async ({
    page,
  }) => {
    await expectNoLegacyLinks(page, path, ready);
  });
}

// seedProfileUser is synchronous — it shells out to `bin/rails runner` and
// returns TestCredentials, not a promise. Its own suffix keeps this file's
// fixture row off the ones profile.spec.ts and accessibility.spec.ts mutate,
// since playwright.config.ts runs fullyParallel.
const profileUser = seedProfileUser("-links");

// One test, not one per screen: each `signIn` is a real round trip through the
// login form, and this fixture's screens are cheap to walk once signed in.
test("must not link out to a replaced HAML path from the signed-in screens", async ({
  page,
}) => {
  await signIn(page, profileUser);

  const signedInPages: {
    path: string;
    ready: (page: Page) => Locator;
  }[] = [
    {
      path: spaPaths.profile,
      ready: (page) =>
        page.getByRole("combobox", { name: "My constituency is" }),
    },
    {
      path: spaPaths.constituency,
      ready: (page) =>
        page.getByRole("combobox", { name: "My constituency is" }),
    },
    {
      path: spaPaths.review,
      ready: (page) => page.getByRole("img", { name: /predicted vote share/i }),
    },
    {
      path: spaPaths.mobile,
      ready: (page) => page.getByLabel("My mobile number is"),
    },
    {
      path: spaPaths.swap,
      ready: (page) =>
        page.getByRole("heading", {
          name: "We’re looking for a voting partner for you",
        }),
    },
    {
      path: spaPaths.share,
      ready: (page) => page.getByRole("link", { name: /No Thanks, Skip/ }),
    },
    {
      path: spaPaths.confirmAccountDeletion,
      ready: (page) =>
        page.getByRole("button", { name: "Yes, delete my account" }),
    },
  ];

  for (const { path, ready } of signedInPages) {
    await expectNoLegacyLinks(page, path, ready);
  }
});

// The dashboard and the vote screen only exist once a swap is confirmed — the
// fixture above deliberately has no swap, and the dashboard redirects it
// straight to /app/swap — so they need their own pair. They are worth the
// extra seed: between them they render SwapConfirmed, InfoSummary and
// ReachOutToSwap, which is more link-bearing markup than any other screen.
const swapPair = seedConfirmedSwapPair("-links");

test("must not link out to a replaced HAML path from the confirmed-swap screens", async ({
  page,
}) => {
  await signIn(page, swapPair.chooser);

  await expectNoLegacyLinks(page, spaPaths.dashboard, (dashboard) =>
    dashboard.getByRole("heading", { name: /swapped your vote with/ }),
  );
  await expectNoLegacyLinks(page, spaPaths.vote, (vote) =>
    vote.getByRole("button", { name: /Yes, I've voted/ }),
  );
});
