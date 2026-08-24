import { expect, test } from "@playwright/test";
import { spaPaths } from "@/lib/spaPaths";
import { signIn } from "./support/auth";
import {
  seedProfileUser,
  seedUserWithoutConstituency,
} from "./support/seedProfileUser";

const credentials = seedProfileUser();
const credentialsWithoutConstituency = seedUserWithoutConstituency();

// These two tests share one fixture user and mutate it (party, email).
// `fullyParallel` (playwright.config.ts) would otherwise run them in separate
// workers at the same time, racing each other's saves against the same row —
// serial keeps them in one worker, in file order.
test.describe("profile screen", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await signIn(page, credentials);
  });

  test("must send a changed offered vote to the review screen", async ({
    page,
  }) => {
    await page.goto(spaPaths.profile);

    await page
      .getByLabel(/willing to vote for/i)
      .selectOption({ label: "Green" });
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page).toHaveURL(new RegExp(`${spaPaths.review}$`));
    await expect(page.getByText(/predicted results for Woking/i)).toBeVisible();
  });

  test("must save an email change, without asking for a review, and keep it", async ({
    page,
  }) => {
    // A genuinely different address, not the one already there: filling in
    // the value the field already holds would pass even if the save quietly
    // dropped the edit. Reverted to the original at the end of the test so
    // the fixture row (and signIn() for any other test/run reusing it) stays
    // on the email seedProfileUser() actually seeds.
    const updatedEmail = credentials.email.replace("@", "+updated@");

    await page.goto(spaPaths.profile);
    await page.getByLabel(/email address/i).fill(updatedEmail);
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText(/your profile has been saved/i)).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${spaPaths.profile}$`));

    // Round-trip: reload from the server rather than trusting the form's own
    // (already-submitted) local state.
    await page.reload();
    await expect(page.getByLabel(/email address/i)).toHaveValue(updatedEmail);

    await page.getByLabel(/email address/i).fill(credentials.email);
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText(/your profile has been saved/i)).toBeVisible();
  });
});

// `.container-narrow` is defined in globals.scss, not in the Sprockets
// stylesheet the SPA never loads — this is what catches it going missing
// again, since jsdom loads no CSS and the component tests cannot see width.
test("must hold the profile form in the legacy reading column", async ({
  page,
}) => {
  await signIn(page, credentials);
  await page.goto(spaPaths.profile);

  const container = page.locator(".container-narrow");
  await expect(container).toBeVisible();

  const box = await container.boundingBox();
  expect(box?.width).toBeLessThanOrEqual(610);
});

test("must refuse to save the constituency screen with nothing chosen", async ({
  page,
}) => {
  // A dedicated fixture with no constituency at all, rather than clearing
  // the shared fixture's pre-filled one: see seedUserWithoutConstituency.
  await signIn(page, credentialsWithoutConstituency);
  await page.goto(spaPaths.constituency);

  await page.getByRole("button", { name: "Save" }).click();

  await expect(
    page.getByText(/you must tell us your constituency/i),
  ).toBeVisible();
});
