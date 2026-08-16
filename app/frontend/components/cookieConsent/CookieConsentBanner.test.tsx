import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { CookieConsentBanner } from "@/components/cookieConsent/CookieConsentBanner";
import { CookieConsentProvider } from "@/contexts/CookieConsentContext";
import { CONSENT_COOKIE_NAME } from "@/lib/cookieConsent";
import { STATIC_PATHS } from "@/lib/staticPaths";
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
  clearTestCookie(CONSENT_COOKIE_NAME);
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
    ).toHaveAttribute("href", STATIC_PATHS.cookies);
  });

  it("stays hidden when the legacy site already recorded consent", () => {
    setTestCookie(CONSENT_COOKIE_NAME, "dismiss");
    renderBanner();
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });

  it("hides and persists allow when accepted", async () => {
    renderBanner();
    await userEvent.click(screen.getByRole("button", { name: /accept/i }));
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    expect(document.cookie).toContain(`${CONSENT_COOKIE_NAME}=allow`);
  });

  it("hides and persists deny when declined", async () => {
    renderBanner();
    await userEvent.click(screen.getByRole("button", { name: /decline/i }));
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    expect(document.cookie).toContain(`${CONSENT_COOKIE_NAME}=deny`);
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
