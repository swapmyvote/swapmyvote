import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page, test } from "@playwright/test";
import { spaPaths } from "@/lib/spaPaths";
import { signIn } from "./support/auth";
import { seedProfileUser } from "./support/seedProfileUser";

// The M1 static pages, under the `/app/*` preview paths they are served from
// until each one is cut over. spaPaths also carries `faq`, which is not
// migrated yet (M2) and has no Rails route, so it is deliberately not scanned.
const migratedPages = [
  { name: "About", path: spaPaths.about },
  { name: "Contact", path: spaPaths.contact },
  { name: "Cookie Policy", path: spaPaths.cookies },
  { name: "Terms of Use", path: spaPaths.terms },
  { name: "Log in", path: spaPaths.login },
  { name: "Sign up", path: spaPaths.signup },
];

// Gate on the WCAG 2.0/2.1 A and AA rule sets — the conformance target — rather
// than axe's whole catalogue, which also carries advisory "best-practice" rules
// (such as requiring an h1) that are not part of that target.
const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

for (const { name, path } of migratedPages) {
  test(`must report no WCAG A/AA violations when the ${name} page is rendered`, async ({
    page,
  }, testInfo) => {
    await page.goto(path);
    // React mounts into an empty #root, so wait for real content — otherwise
    // axe can scan the pre-hydration shell and pass on an empty page.
    await expect(page.getByRole("main")).not.toBeEmpty();

    const { violations } = await new AxeBuilder({ page })
      .withTags(wcagTags)
      .analyze();

    if (violations.length > 0) {
      // The assertion below reports one line per violation; attach the full
      // axe output (selectors, failure summaries) to the HTML report so a CI
      // failure can be diagnosed without reproducing it locally.
      await testInfo.attach("axe-violations.json", {
        body: JSON.stringify(violations, null, 2),
        contentType: "application/json",
      });
    }

    expect(
      violations.map(
        (violation) =>
          `${violation.id} (${violation.nodes.length} nodes): ${violation.help}`,
      ),
    ).toEqual([]);
  });
}

// The M4 profile screens. These need a logged-in session, so each test signs
// in itself rather than sharing the anonymous flow above. A dedicated suffix
// keeps this fixture user's row separate from profile.spec.ts's: that spec
// mutates its user (party, constituency), and fullyParallel can run these
// files at the same time, so sharing a row would let one file's reseed or
// save race the other's read.
const credentials = seedProfileUser("-axe");

// Unlike the public pages above, these three fetch reference data (parties,
// constituencies, poll results) before showing real content, and show a
// spinner meanwhile. `main` non-empty is satisfied by the heading alone —
// that's the card's static header, present even while the body is just a
// spinner — so it would let the scan run against a card containing nothing
// but that spinner and miss anything (like the postcode Search button) that
// only exists once the form has actually loaded. Wait for a locator that
// only appears once the real content has rendered instead.
const signedInPages: {
  name: string;
  path: string;
  ready: (page: Page) => Locator;
}[] = [
  {
    name: "Profile",
    path: spaPaths.profile,
    ready: (page) => page.getByRole("combobox", { name: "My constituency is" }),
  },
  {
    name: "Constituency",
    path: spaPaths.constituency,
    ready: (page) => page.getByRole("combobox", { name: "My constituency is" }),
  },
  {
    name: "Review",
    path: spaPaths.review,
    ready: (page) => page.getByRole("img", { name: /predicted vote share/i }),
  },
  {
    name: "Mobile",
    path: spaPaths.mobile,
    ready: (page) => page.getByLabel("My mobile number is"),
  },
];

for (const { name, path, ready } of signedInPages) {
  test(`must report no WCAG A/AA violations when the ${name} page is rendered`, async ({
    page,
  }, testInfo) => {
    await signIn(page, credentials);
    await page.goto(path);
    await expect(ready(page)).toBeVisible();

    const { violations } = await new AxeBuilder({ page })
      .withTags(wcagTags)
      .analyze();

    if (violations.length > 0) {
      await testInfo.attach("axe-violations.json", {
        body: JSON.stringify(violations, null, 2),
        contentType: "application/json",
      });
    }

    expect(
      violations.map(
        (violation) =>
          `${violation.id} (${violation.nodes.length} nodes): ${violation.help}`,
      ),
    ).toEqual([]);
  });
}
