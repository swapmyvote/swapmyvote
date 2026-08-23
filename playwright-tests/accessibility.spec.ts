import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { spaPaths } from "@/lib/spaPaths";

// The M1 static pages, under the `/app/*` preview paths they are served from
// until each one is cut over. spaPaths also carries `faq`, which is not
// migrated yet (M2) and has no Rails route, so it is deliberately not scanned.
const migratedPages = [
  { name: "About", path: spaPaths.about },
  { name: "Contact", path: spaPaths.contact },
  { name: "Cookie Policy", path: spaPaths.cookies },
  { name: "Terms of Use", path: spaPaths.terms },
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
