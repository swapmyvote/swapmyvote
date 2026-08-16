/**
 * Rails renders the per-session CSRF token into the SPA layout via
 * `csrf_meta_tags` (app/views/layouts/spa.html.haml). Because the SPA is
 * served same-origin, `protect_from_forgery with: :exception` stays on and
 * every non-GET must echo this token back in `X-CSRF-Token`.
 *
 * Read lazily, never cached: Rails can rotate the token, and a stale copy
 * means a rejected request.
 */
export const CSRF_HEADER = "X-CSRF-Token";

export function csrfToken(): string | null {
  const meta = document.querySelector<HTMLMetaElement>(
    'meta[name="csrf-token"]',
  );
  return meta?.content || null;
}
