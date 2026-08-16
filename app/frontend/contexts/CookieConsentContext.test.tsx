import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import {
  CookieConsentProvider,
  useCookieConsent,
} from "@/contexts/CookieConsentContext";
import { CONSENT_COOKIE_NAME } from "@/lib/cookieConsent";
import { clearTestCookie, setTestCookie } from "@/test/cookieHelpers";

function Probe() {
  const { status, hasAnswered, analyticsAllowed, accept, decline } =
    useCookieConsent();
  return (
    <div>
      <span data-testid="status">{status ?? "unset"}</span>
      <span data-testid="answered">{String(hasAnswered)}</span>
      <span data-testid="analytics">{String(analyticsAllowed)}</span>
      <button type="button" onClick={accept}>
        accept
      </button>
      <button type="button" onClick={decline}>
        decline
      </button>
    </div>
  );
}

function renderProbe() {
  return render(
    <CookieConsentProvider>
      <Probe />
    </CookieConsentProvider>,
  );
}

afterEach(() => {
  clearTestCookie(CONSENT_COOKIE_NAME);
});

describe("CookieConsentProvider", () => {
  it("starts unanswered when no cookie is set", () => {
    renderProbe();
    expect(screen.getByTestId("status")).toHaveTextContent("unset");
    expect(screen.getByTestId("answered")).toHaveTextContent("false");
    expect(screen.getByTestId("analytics")).toHaveTextContent("false");
  });

  it("seeds from an existing legacy dismiss cookie", () => {
    setTestCookie(CONSENT_COOKIE_NAME, "dismiss");
    renderProbe();
    expect(screen.getByTestId("answered")).toHaveTextContent("true");
    expect(screen.getByTestId("analytics")).toHaveTextContent("true");
  });

  it("records an accept in state and in the cookie", async () => {
    renderProbe();
    await userEvent.click(screen.getByRole("button", { name: "accept" }));
    expect(screen.getByTestId("status")).toHaveTextContent("allow");
    expect(screen.getByTestId("analytics")).toHaveTextContent("true");
    expect(document.cookie).toContain(`${CONSENT_COOKIE_NAME}=allow`);
  });

  it("records a decline in state and in the cookie", async () => {
    renderProbe();
    await userEvent.click(screen.getByRole("button", { name: "decline" }));
    expect(screen.getByTestId("status")).toHaveTextContent("deny");
    expect(screen.getByTestId("analytics")).toHaveTextContent("false");
    expect(document.cookie).toContain(`${CONSENT_COOKIE_NAME}=deny`);
  });
});

describe("useCookieConsent", () => {
  it("throws when used outside a provider", () => {
    expect(() => render(<Probe />)).toThrow(/CookieConsentProvider/);
  });
});
