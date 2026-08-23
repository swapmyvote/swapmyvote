import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import {
  GoogleTagManager,
  GTM_SCRIPT_ID,
} from "@/components/analytics/GoogleTagManager";
import { CookieConsentBanner } from "@/components/cookieConsent/CookieConsentBanner";
import { CookieConsentProvider } from "@/contexts/CookieConsentContext";
import { CONSENT_COOKIE_NAME } from "@/lib/cookieConsent";
import { clearTestCookie, setTestCookie } from "@/test/cookieHelpers";

function setGtmMeta(id: string) {
  const meta = document.createElement("meta");
  meta.setAttribute("name", "google-tag-manager-id");
  meta.setAttribute("content", id);
  document.head.appendChild(meta);
}

function gtmScripts() {
  return document.querySelectorAll(`#${GTM_SCRIPT_ID}`);
}

function Stack() {
  return (
    <MemoryRouter>
      <CookieConsentProvider>
        <GoogleTagManager />
        <CookieConsentBanner />
      </CookieConsentProvider>
    </MemoryRouter>
  );
}

function renderWithConsent() {
  return render(<Stack />);
}

afterEach(() => {
  clearTestCookie(CONSENT_COOKIE_NAME);
  for (const meta of document.head.querySelectorAll("meta")) {
    meta.remove();
  }
  for (const script of gtmScripts()) {
    script.remove();
  }
});

describe("GoogleTagManager", () => {
  it("does not load analytics before consent is given", () => {
    setGtmMeta("GTM-TEST");
    renderWithConsent();
    expect(gtmScripts()).toHaveLength(0);
  });

  it("does not load analytics when consent is denied", () => {
    setGtmMeta("GTM-TEST");
    setTestCookie(CONSENT_COOKIE_NAME, "deny");
    renderWithConsent();
    expect(gtmScripts()).toHaveLength(0);
  });

  it("loads analytics for an existing allow", () => {
    setGtmMeta("GTM-TEST");
    setTestCookie(CONSENT_COOKIE_NAME, "allow");
    renderWithConsent();
    const script = document.getElementById(GTM_SCRIPT_ID) as HTMLScriptElement;
    expect(script.src).toContain(
      "https://www.googletagmanager.com/gtm.js?id=GTM-TEST",
    );
  });

  it("loads analytics for a legacy dismiss", () => {
    setGtmMeta("GTM-TEST");
    setTestCookie(CONSENT_COOKIE_NAME, "dismiss");
    renderWithConsent();
    expect(gtmScripts()).toHaveLength(1);
  });

  it("loads analytics as soon as the banner is accepted", async () => {
    setGtmMeta("GTM-TEST");
    renderWithConsent();
    expect(gtmScripts()).toHaveLength(0);
    await userEvent.click(screen.getByRole("button", { name: /accept/i }));
    expect(gtmScripts()).toHaveLength(1);
  });

  it("never injects the script twice", () => {
    setGtmMeta("GTM-TEST");
    setTestCookie(CONSENT_COOKIE_NAME, "allow");
    const { rerender } = renderWithConsent();
    rerender(<Stack />);
    expect(gtmScripts()).toHaveLength(1);
  });

  it("loads nothing when the layout supplied no GTM id", () => {
    setTestCookie(CONSENT_COOKIE_NAME, "allow");
    renderWithConsent();
    expect(gtmScripts()).toHaveLength(0);
  });
});
