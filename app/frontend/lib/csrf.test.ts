import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { csrfToken, setCsrfToken } from "@/lib/csrf";

function setCsrfMeta(token: string | null) {
  document.head.innerHTML =
    token === null ? "" : `<meta name="csrf-token" content="${token}">`;
}

describe("csrfToken", () => {
  beforeEach(() => {
    setCsrfToken(null);
    setCsrfMeta("boot-time-token");
  });

  afterEach(() => {
    setCsrfToken(null);
    document.head.innerHTML = "";
  });

  it("reads the token Rails rendered into the page", () => {
    expect(csrfToken()).toBe("boot-time-token");
  });

  it("is null when the page has no token", () => {
    setCsrfMeta(null);

    expect(csrfToken()).toBeNull();
  });

  // Logging in rotates the token, so the meta tag goes stale the moment the
  // session changes and the learned one has to win.
  it("prefers a token learned at runtime over the meta tag", () => {
    setCsrfToken("rotated-token");

    expect(csrfToken()).toBe("rotated-token");
  });

  it("falls back to the meta tag again once the override is cleared", () => {
    setCsrfToken("rotated-token");
    setCsrfToken(null);

    expect(csrfToken()).toBe("boot-time-token");
  });
});
