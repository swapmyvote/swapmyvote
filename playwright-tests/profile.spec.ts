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

  test("must save an email change without asking for a review", async ({
    page,
  }) => {
    await page.goto(spaPaths.profile);

    await page.getByLabel(/email address/i).fill(credentials.email);
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText(/your profile has been saved/i)).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${spaPaths.profile}$`));
  });
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
