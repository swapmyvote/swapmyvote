import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { CookieConsentBanner } from "@/components/cookieConsent/CookieConsentBanner";
import { CookieConsentProvider } from "@/contexts/CookieConsentContext";
import { consentCookieName } from "@/lib/cookieConsent";
import { spaPaths } from "@/lib/spaPaths";
import { clearTestCookie, setTestCookie } from "@/test/cookieHelpers";

function renderBanner() {
  return render(
    <MemoryRouter>
      <CookieConsentProvider>
        <CookieConsentBanner />
      </CookieConsentProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  clearTestCookie(consentCookieName);
});

describe("CookieConsentBanner", () => {
  it("shows when consent has not been given", () => {
    renderBanner();
    expect(
      screen.getByRole("complementary", { name: /cookie consent/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/we use cookies to improve your experience/i),
    ).toBeInTheDocument();
  });

  it("links the in-SPA cookie policy", () => {
    renderBanner();
    expect(
      screen.getByRole("link", { name: /cookie policy/i }),
    ).toHaveAttribute("href", spaPaths.cookies);
  });

  it("stays hidden when the legacy site already recorded consent", () => {
    setTestCookie(consentCookieName, "dismiss");
    renderBanner();
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });

  it("hides and persists allow when accepted", async () => {
    renderBanner();
    await userEvent.click(screen.getByRole("button", { name: /accept/i }));
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    expect(document.cookie).toContain(`${consentCookieName}=allow`);
  });

  it("hides and persists deny when declined", async () => {
    renderBanner();
    await userEvent.click(screen.getByRole("button", { name: /decline/i }));
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    expect(document.cookie).toContain(`${consentCookieName}=deny`);
  });

  // The banner is fixed to the bottom of the viewport, so without this the
  // footer's last rows sit underneath it. jsdom lays nothing out, so the
  // height measures 0 — what matters here is that the variable is published
  // while the banner is up and withdrawn the moment it is answered.
  it("reserves its height at the foot of the page while it is showing", () => {
    renderBanner();

    expect(
      document.documentElement.style.getPropertyValue(
        "--cookie-consent-height",
      ),
    ).toBe("0px");
  });

  it("stops reserving that height once it is answered", async () => {
    renderBanner();
    await userEvent.click(screen.getByRole("button", { name: /accept/i }));

    expect(
      document.documentElement.style.getPropertyValue(
        "--cookie-consent-height",
      ),
    ).toBe("");
  });

  it("puts both choices in the keyboard tab order", async () => {
    renderBanner();
    await userEvent.tab();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: /decline/i })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: /accept/i })).toHaveFocus();
  });
});
