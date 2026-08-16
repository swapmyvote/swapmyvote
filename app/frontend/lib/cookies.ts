// Minimal document.cookie helpers. No dependency, no consent knowledge — the
// cookie contract itself lives in @/lib/cookieConsent.
//
// buildCookieString is exported separately from writeCookie so the attributes
// can be asserted in tests: jsdom silently drops a cookie whose `domain` does
// not match the test host, so a round-trip cannot prove the domain was set.

export type CookieOptions = {
  domain?: string;
  path?: string;
  maxAgeSeconds?: number;
  sameSite?: "Lax" | "Strict" | "None";
  secure?: boolean;
};

export function buildCookieString(
  name: string,
  value: string,
  options: CookieOptions = {},
): string {
  const parts = [
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
    `path=${options.path ?? "/"}`,
  ];
  if (options.domain) {
    parts.push(`domain=${options.domain}`);
  }
  if (options.maxAgeSeconds !== undefined) {
    parts.push(`max-age=${options.maxAgeSeconds}`);
  }
  parts.push(`SameSite=${options.sameSite ?? "Lax"}`);
  if (options.secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

export function readCookie(name: string): string | null {
  let jar: string;
  try {
    jar = document.cookie;
  } catch {
    // Hardened privacy settings can make document.cookie throw. Treat that as
    // "no cookie" rather than crashing the app.
    return null;
  }
  const prefix = `${encodeURIComponent(name)}=`;
  for (const part of jar.split(";")) {
    const entry = part.trim();
    if (entry.startsWith(prefix)) {
      const raw = entry.slice(prefix.length);
      try {
        return decodeURIComponent(raw);
      } catch {
        // decodeURIComponent throws on a malformed escape ("%", "%zz"). Anything
        // on the domain can write a cookie, and readConsent() runs during the
        // provider's first render, so a throw here would take down the whole
        // SPA. Fall back to the raw value; callers validate what they get.
        return raw;
      }
    }
  }
  return null;
}

export function writeCookie(
  name: string,
  value: string,
  options: CookieOptions = {},
): boolean {
  try {
    // biome-ignore lint/suspicious/noDocumentCookie: the Cookie Store API is async and unsupported in Safari/Firefox
    document.cookie = buildCookieString(name, value, options);
    return true;
  } catch {
    return false;
  }
}
