/**
 * Rails renders the per-session CSRF token into the SPA layout via
 * `csrf_meta_tags` (app/views/layouts/spa.html.haml). Because the SPA is
 * served same-origin, `protect_from_forgery with: :exception` stays on and
 * every non-GET must echo this token back in `X-CSRF-Token`.
 *
 * The meta tag is only ever right until the session changes: logging in and
 * signing up rotate the token (Devise's csrf_cleaner hook), and logging out
 * throws the session away. Those three endpoints answer with the replacement
 * in an `X-CSRF-Token` response header, which apiClient feeds to
 * `setCsrfToken` — so a token learned at runtime always wins over the one the
 * page booted with.
 */
export const csrfHeader = "X-CSRF-Token";

// Set from a response header; null until the session changes, and again
// whenever the override is cleared (which tests do, and nothing else needs).
let learnedToken: string | null = null;

export function setCsrfToken(token: string | null): void {
  learnedToken = token;
}

export function csrfToken(): string | null {
  if (learnedToken) {
    return learnedToken;
  }
  // Read lazily, never cached: a full page load renders a fresh tag, and a
  // stale copy means a rejected request.
  const meta = document.querySelector<HTMLMetaElement>(
    'meta[name="csrf-token"]',
  );
  return meta?.content || null;
}
