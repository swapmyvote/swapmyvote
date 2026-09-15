import { expect, type Page, test } from "@playwright/test";
import { spaPaths } from "@/lib/spaPaths";
import { setAppMode } from "./support/appMode";
import { seedProfileUser } from "./support/seedProfileUser";

// Not for the user — for the constituency, party and poll rows it creates.
// The entry form needs real Woking/Wakefield rows in the reference data the
// SPA fetches. The suffix keeps its user row off profile.spec.ts's.
seedProfileUser("-home");

const WOKING_ONS_ID = "E14001592";

/**
 * Stand in for postcodes.io.
 *
 * `lib/postcodes.ts` calls it directly rather than going through our backend
 * (deliberately — see its header comment), so a spec that really hit it would
 * put a third party's uptime in CI's path. Everything downstream of this one
 * call stays real: our constituency list, POST /api/v1/pre_populate, and the
 * handoff to sign-up.
 */
async function mockPostcodeLookup(
  page: Page,
  result: { onsId: string; name: string } | { status: number; error: string },
) {
  await page.route("https://api.postcodes.io/postcodes/*", async (route) => {
    if ("status" in result) {
      await route.fulfill({
        status: result.status,
        contentType: "application/json",
        body: JSON.stringify({ error: result.error }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        result: {
          parliamentary_constituency_2024: result.name,
          codes: { parliamentary_constituency_2024: result.onsId },
        },
      }),
    });
  });
}

const constituencyField = (page: Page) =>
  page.getByRole("combobox", { name: "My constituency is" });

// NewsSignUp's cookie-consent notice (ActionNetworkForm's "hosted by Action
// Network..." copy) is also role="alert" and is on every render of this page
// regardless of phase, so a bare getByRole("alert") is ambiguous between it
// and the form's own validation/lookup errors. Distinguish on the Bootstrap
// variant rather than on copy: every error Alert in the entry form
// (EntryForm, ConstituencyStep, PartiesStep, PostcodeLookup) is rendered
// variant="danger" (class `alert-danger`), while the cookie notice is
// variant="light" (`alert-light`) — a semantic error-vs-notice distinction,
// not an incidental string, so it won't break if either alert's wording
// changes.
const formAlert = (page: Page) => page.locator('[role="alert"].alert-danger');

test.describe("the home entry form", () => {
  test.beforeEach(async ({ page }) => {
    // Pin the phase rather than relying on how the stack was booted: the entry
    // form only renders while swapping is open.
    await setAppMode(page, "open");
  });

  test("must carry a postcode through to sign up", async ({ page }) => {
    await mockPostcodeLookup(page, { onsId: WOKING_ONS_ID, name: "Woking" });

    await expect(
      page.getByRole("heading", { name: /Make your vote count in the/i }),
    ).toBeVisible();

    await page
      .getByLabel(/find my constituency using my postcode/i)
      .fill("GU21 6XX");
    await page.getByRole("button", { name: "Search" }).click();

    // The lookup fills in the picker — the two inputs are two ways of
    // answering one question.
    await expect(constituencyField(page)).toHaveValue("Woking");

    await page.getByRole("button", { name: "Next: Choose Parties" }).click();

    await page
      .getByLabel(/Which party would you most like to vote for\?/i)
      .selectOption({ label: "Conservative" });
    await page
      .getByLabel(/which party could you vote for in exchange\?/i)
      .selectOption({ label: "Green" });
    await page.getByRole("button", { name: "Next: Sign Up" }).click();

    await expect(page).toHaveURL(new RegExp(`${spaPaths.signup}$`));
  });

  test("must refuse a postcode outside the constituencies we cover", async ({
    page,
  }) => {
    // A real postcodes.io result, for a seat this install has no row for.
    await mockPostcodeLookup(page, {
      onsId: "E14000999",
      name: "Somewhere We Do Not Run",
    });

    await page
      .getByLabel(/find my constituency using my postcode/i)
      .fill("SW1A 1AA");
    await page.getByRole("button", { name: "Search" }).click();

    await expect(formAlert(page)).toContainText(
      /not in one of the accepted constituencies/i,
    );
    await expect(constituencyField(page)).toHaveValue("");
  });

  test("must surface the service's own wording for a bad postcode", async ({
    page,
  }) => {
    await mockPostcodeLookup(page, {
      status: 404,
      error: "Postcode not found",
    });

    await page
      .getByLabel(/find my constituency using my postcode/i)
      .fill("ZZ99 9ZZ");
    await page.getByRole("button", { name: "Search" }).click();

    await expect(formAlert(page)).toContainText(/Postcode not found/i);
  });

  test("must refuse to move on with no constituency chosen", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Next: Choose Parties" }).click();

    await expect(formAlert(page)).toContainText(
      /Please choose your constituency/i,
    );
  });

  test("must refuse the same party twice", async ({ page }) => {
    await mockPostcodeLookup(page, { onsId: WOKING_ONS_ID, name: "Woking" });

    await page
      .getByLabel(/find my constituency using my postcode/i)
      .fill("GU21 6XX");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(constituencyField(page)).toHaveValue("Woking");
    await page.getByRole("button", { name: "Next: Choose Parties" }).click();

    await page
      .getByLabel(/Which party would you most like to vote for\?/i)
      .selectOption({ label: "Green" });
    await page
      .getByLabel(/which party could you vote for in exchange\?/i)
      .selectOption({ label: "Green" });
    await page.getByRole("button", { name: "Next: Sign Up" }).click();

    await expect(formAlert(page)).toContainText(/cannot be the same/i);
    await expect(page).not.toHaveURL(new RegExp(`${spaPaths.signup}$`));
  });
});
