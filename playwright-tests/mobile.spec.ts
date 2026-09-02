import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { spaPaths } from "@/lib/spaPaths";
import { signIn } from "./support/auth";
import { fakeOtp } from "./support/otp";
import { seedProfileUser } from "./support/seedProfileUser";

// See seedProfileUser.ts: a stale Spring preloader leaves `runner` hanging
// with no output, which stalls the suite before a test starts.
const railsEnv = { ...process.env, DISABLE_SPRING: "1" };

// Its own fixture row: this spec verifies and re-verifies, which would race
// the profile spec's saves under fullyParallel.
const credentials = seedProfileUser("-mobile");

// A number no other spec uses: MobilePhone enforces uniqueness table-wide,
// so a shared one fails whichever spec runs second.
const number = "+447400123456";

// All three share that number and that user, and `fullyParallel` runs tests
// within a file in separate workers. Without `serial`, one worker's confirm
// with the right code can land between another's send and its own confirm
// with a wrong one, leaving the second looking at an already-verified number
// instead of the refusal it submitted for.
test.describe("mobile verification", () => {
  test.describe.configure({ mode: "serial" });

  // Start from "no number", whatever the last run left behind.
  test.beforeEach(() => {
    execFileSync(
      "bin/rails",
      [
        "runner",
        `MobilePhone.where(number: "${number}").destroy_all
       User.find_by(email: "${credentials.email}")&.mobile_phone&.destroy`,
      ],
      { stdio: "inherit", env: railsEnv },
    );
  });

  test("must send a code and verify the number", async ({ page }) => {
    await signIn(page, credentials);
    await page.goto(spaPaths.mobile);

    await page.getByLabel("My mobile number is").fill(number);
    await page.getByRole("button", { name: "Send me a code" }).click();

    await expect(
      page.getByText(/A verification code was sent to/),
    ).toBeVisible();

    await page.getByLabel("The 6 digit code").fill(fakeOtp);
    await page.getByRole("button", { name: "Verify" }).click();

    await expect(
      page.getByText("Thank you for verifying your mobile phone number"),
    ).toBeVisible();

    // The session really changed, not just this page's state: the profile
    // screen reads mobileVerified from the same payload.
    await page.goto(spaPaths.profile);
    await expect(page.getByText(/My mobile number is verified/)).toBeVisible();
  });

  test("must refuse a wrong code and keep the form open", async ({ page }) => {
    await signIn(page, credentials);
    await page.goto(spaPaths.mobile);

    await page.getByLabel("My mobile number is").fill(number);
    await page.getByRole("button", { name: "Send me a code" }).click();

    await page.getByLabel("The 6 digit code").fill("000000");
    await page.getByRole("button", { name: "Verify" }).click();

    await expect(page.getByRole("alert")).toContainText(
      /code you entered was incorrect/,
    );
    await expect(page.getByLabel("The 6 digit code")).toBeVisible();
  });

  test("must refuse a number that is not a mobile and never show the code step", async ({
    page,
  }) => {
    await signIn(page, credentials);
    await page.goto(spaPaths.mobile);

    await page.getByLabel("My mobile number is").fill("+442079460000");
    await page.getByRole("button", { name: "Send me a code" }).click();

    await expect(
      page.getByText("This doesn't look like a mobile phone number"),
    ).toBeVisible();
    await expect(page.getByLabel("The 6 digit code")).toHaveCount(0);
  });
});
