import { expect, test } from "@playwright/test";
import { staticPaths } from "@/lib/staticPaths";
import { documentWasReplaced, stampDocument } from "./support/documentStamp";

// The SPA and the legacy HAML site coexist route by route, so the link
// boundary is load-bearing: links between migrated pages must stay inside the
// SPA, and links to pages Rails still renders must leave it. Getting either
// wrong is invisible in a screenshot — hence the document-stamp check.
test.describe("SPA/HAML link boundary", () => {
  test("must navigate without a full page load when a link between migrated pages is followed", async ({
    page,
  }) => {
    await page.goto(staticPaths.terms);
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

    await expect(page).toHaveURL(staticPaths.cookies);
    await expect(
      page.getByRole("heading", { name: "Cookie Policy", level: 1 }),
    ).toBeVisible();
    expect(await documentWasReplaced(page)).toBe(false);
  });

  test("must do a full page load when a link to a page still served by Rails is followed", async ({
    page,
  }) => {
    await page.goto(staticPaths.terms);
    await stampDocument(page);

    // The FAQ has not been migrated (M2), so the footer links to it with a
    // plain <a>. Of the un-migrated pages the footer links to, this one reads
    // nothing from the database — /api renders sampled Party rows and would
    // 500 against the schema-only database CI builds, which the assertions
    // below would not catch, since a full load to an error page still counts
    // as a full load.
    await page
      .getByRole("contentinfo")
      .getByRole("link", { name: "FAQ", exact: true })
      .click();

    await expect(page).toHaveURL("/faq");
    // Assert the legacy page actually rendered, so this cannot pass against a
    // Rails error page.
    await expect(
      page.getByRole("heading", { name: "FAQ", level: 1 }),
    ).toBeVisible();
    expect(await documentWasReplaced(page)).toBe(true);
  });
});
