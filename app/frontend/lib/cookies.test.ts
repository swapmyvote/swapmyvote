import { afterEach, describe, expect, it } from "vitest";
import { buildCookieString, readCookie, writeCookie } from "@/lib/cookies";
import { clearTestCookie, setTestCookie } from "@/test/cookieHelpers";

describe("buildCookieString", () => {
  it("defaults to a root path and SameSite=Lax", () => {
    expect(buildCookieString("a", "b")).toBe("a=b; path=/; SameSite=Lax");
  });

  it("includes the domain when one is given", () => {
    expect(buildCookieString("a", "b", { domain: "swapmyvote.uk" })).toContain(
      "domain=swapmyvote.uk",
    );
  });

  it("omits the domain attribute when it is blank or absent", () => {
    expect(buildCookieString("a", "b", { domain: "" })).not.toContain("domain");
    expect(buildCookieString("a", "b")).not.toContain("domain");
  });

  it("includes max-age and Secure when asked", () => {
    const built = buildCookieString("a", "b", {
      maxAgeSeconds: 31536000,
      secure: true,
    });
    expect(built).toContain("max-age=31536000");
    expect(built).toContain("Secure");
  });

  it("omits Secure by default", () => {
    expect(buildCookieString("a", "b")).not.toContain("Secure");
  });

  it("encodes the value", () => {
    expect(buildCookieString("a", "b c")).toContain("a=b%20c");
  });
});

describe("readCookie / writeCookie", () => {
  afterEach(() => {
    clearTestCookie("smv_test");
    clearTestCookie("smv_other");
  });

  it("round-trips a value", () => {
    expect(writeCookie("smv_test", "allow")).toBe(true);
    expect(readCookie("smv_test")).toBe("allow");
  });

  it("returns null for a cookie that is not set", () => {
    expect(readCookie("smv_missing")).toBeNull();
  });

  it("does not match on a name prefix", () => {
    writeCookie("smv_other", "nope");
    expect(readCookie("smv_oth")).toBeNull();
  });

  it("returns the raw value rather than throwing on a malformed escape", () => {
    // Anything on the domain can write a cookie, and readCookie runs during the
    // consent provider's first render — a URIError here would break the SPA.
    setTestCookie("smv_test", "100%");
    expect(readCookie("smv_test")).toBe("100%");
  });
});
