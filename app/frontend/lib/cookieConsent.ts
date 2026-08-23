import { readCookie, writeCookie } from "@/lib/cookies";
import { readMeta } from "@/lib/meta";

// The consent cookie is SHARED with the legacy HAML site, which writes it via
// cookieconsent@3 (app/views/layouts/_cookie_consent.html.haml). Name, path and
// expiry below match that library's defaults exactly, and the domain comes from
// ENV["SERVER_HOST"] via a meta tag — so a user who answered on one side of the
// HAML/SPA boundary is never re-prompted on the other.
//
// SameSite=Lax and Secure are additions the legacy library does not set. Neither
// affects the legacy site: the cookie is first-party and still readable there.

export const consentCookieName = "_swapmyvote_cookie_consent";
export const consentDomainMeta = "cookie-consent-domain";

const consentMaxAgeSeconds = 365 * 24 * 60 * 60;

// "dismiss" is written by the legacy library's OK button; "allow"/"deny" are
// its opt-in vocabulary, which the legacy site also reads as "already answered".
export type ConsentStatus = "dismiss" | "allow" | "deny";

const consentStatuses: readonly string[] = ["dismiss", "allow", "deny"];

export function readConsent(): ConsentStatus | null {
  const value = readCookie(consentCookieName);
  if (value !== null && consentStatuses.includes(value)) {
    return value as ConsentStatus;
  }
  return null;
}

export function saveConsent(status: ConsentStatus): boolean {
  const domain = readMeta(consentDomainMeta);
  return writeCookie(consentCookieName, status, {
    domain: domain ?? undefined,
    path: "/",
    maxAgeSeconds: consentMaxAgeSeconds,
    sameSite: "Lax",
    secure: window.location.protocol === "https:",
  });
}

export function analyticsAllowed(status: ConsentStatus | null): boolean {
  return status === "allow" || status === "dismiss";
}
