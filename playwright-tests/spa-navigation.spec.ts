import { expect, test } from "@playwright/test";
import { spaPaths } from "@/lib/spaPaths";
import { documentWasReplaced, stampDocument } from "./support/documentStamp";

// The SPA and the legacy HAML site coexist route by route, so the link
// boundary is load-bearing: links between migrated pages must stay inside the
// SPA, and links to pages Rails still renders must leave it. Getting either
// wrong is invisible in a screenshot — hence the document-stamp check.
test.describe("SPA/HAML link boundary", () => {
  test("must navigate without a full page load when a link between migrated pages is followed", async ({
    page,
  }) => {
    await page.goto(spaPaths.terms);
    await expect(
      page.getByRole("heading", { name: "Terms and Conditions of Use" }),
    ).toBeVisible();
    await stampDocument(page);

    // Scoped to `main`: the footer links to the Cookie Policy under the same
    // accessible name, and this spec is about the in-body <Link>.
    await page
      .getByRole("main")
      .getByRole("link", { name: "Cookie Policy" })
      .click();

    await expect(page).toHaveURL(spaPaths.cookies);
    await expect(
      page.getByRole("heading", { name: "Cookie Policy", level: 1 }),
    ).toBeVisible();
    expect(await documentWasReplaced(page)).toBe(false);
  });

  // Retired at M10. Its partner — "must do a full page load when a link to a
  // page still served by Rails is followed" — asserted the other side of the
  // boundary, and there is no longer a link that crosses it. It had already
  // been re-targeted twice as screens were ported (the footer's FAQ link, then
  // the login screen's "Forgotten password?"), and M10 ports password reset
  // and account deletion, which were the last two. Every internal link from a
  // ported screen is now a router <Link> that stays in the SPA, so nothing is
  // left to click: the only remaining full-page navigations are external
  // (forwarddemocracy.com, GitHub), the deliberate log-out `window.location`
  // to the legacy home, and ApiDocs' documented /swap entry point — an API
  // redirect shown as example text, not an internal navigation link.
  //
  // Re-targeting it at any of those would be testing something else under this
  // test's name. The thing worth guarding now is the inverse — that no link
  // points at a path the SPA has replaced — which playwright-tests/
  // no-legacy-links.spec.ts asserts across every ported screen. At cutover the
  // boundary disappears entirely, so this test does not come back.
});

test("must serve the FAQ and API pages from the SPA shell", async ({
  page,
}) => {
  await page.goto(spaPaths.faq);
  await expect(
    page.getByRole("heading", { name: "FAQ", level: 1 }),
  ).toBeVisible();

  await page.goto(spaPaths.api);
  await expect(
    page.getByRole("heading", { name: "Swap My Vote API", level: 1 }),
  ).toBeVisible();
});
