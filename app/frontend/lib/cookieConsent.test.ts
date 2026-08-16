import { afterEach, describe, expect, it, vi } from "vitest";
import {
  analyticsAllowed,
  CONSENT_COOKIE_NAME,
  readConsent,
  saveConsent,
} from "@/lib/cookieConsent";
import * as cookies from "@/lib/cookies";
import { clearTestCookie, setTestCookie } from "@/test/cookieHelpers";

function setDomainMeta(content: string) {
  const meta = document.createElement("meta");
  meta.setAttribute("name", "cookie-consent-domain");
  meta.setAttribute("content", content);
  document.head.appendChild(meta);
}

afterEach(() => {
  clearTestCookie(CONSENT_COOKIE_NAME);
  for (const meta of document.head.querySelectorAll("meta")) {
    meta.remove();
  }
  vi.restoreAllMocks();
});

describe("readConsent", () => {
  it("returns null when the cookie is not set", () => {
    expect(readConsent()).toBeNull();
  });

  it("reads the legacy library's dismiss value", () => {
    setTestCookie(CONSENT_COOKIE_NAME, "dismiss");
    expect(readConsent()).toBe("dismiss");
  });

  it("reads allow and deny", () => {
    setTestCookie(CONSENT_COOKIE_NAME, "allow");
    expect(readConsent()).toBe("allow");
    setTestCookie(CONSENT_COOKIE_NAME, "deny");
    expect(readConsent()).toBe("deny");
  });

  it("treats an unrecognised value as unset", () => {
    setTestCookie(CONSENT_COOKIE_NAME, "banana");
    expect(readConsent()).toBeNull();
  });
});

describe("saveConsent", () => {
  it("persists a status that readConsent can read back", () => {
    saveConsent("allow");
    expect(readConsent()).toBe("allow");
  });

  it("writes the legacy cookie name, path, expiry and domain", () => {
    setDomainMeta("swapmyvote.uk");
    const write = vi.spyOn(cookies, "writeCookie").mockReturnValue(true);
    saveConsent("deny");
    expect(write).toHaveBeenCalledWith(
      "_swapmyvote_cookie_consent",
      "deny",
      expect.objectContaining({
        domain: "swapmyvote.uk",
        path: "/",
        maxAgeSeconds: 31536000,
        sameSite: "Lax",
      }),
    );
  });

  it("omits the domain when no meta tag is present", () => {
    const write = vi.spyOn(cookies, "writeCookie").mockReturnValue(true);
    saveConsent("allow");
    expect(write.mock.calls[0][2]?.domain).toBeUndefined();
  });
});

describe("analyticsAllowed", () => {
  it("allows analytics for an explicit allow", () => {
    expect(analyticsAllowed("allow")).toBe(true);
  });

  it("allows analytics for a legacy dismiss (analytics already ran for them)", () => {
    expect(analyticsAllowed("dismiss")).toBe(true);
  });

  it("refuses analytics for deny and for an unanswered banner", () => {
    expect(analyticsAllowed("deny")).toBe(false);
    expect(analyticsAllowed(null)).toBe(false);
  });
});
