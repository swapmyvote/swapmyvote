# React cookie-consent banner for the SPA

Design for [issue #1039](https://github.com/swapmyvote/swapmyvote/issues/1039). Follow-up to #1037 (M1).

## Problem

The React SPA renders no cookie-consent prompt. The legacy HAML site shows one on
every page via a CDN copy of `cookieconsent@3`, initialised in
`app/views/layouts/_cookie_consent.html.haml`. The `spa` layout deliberately omits
that script (no-CDN posture, Bootstrap 4 era), so migrated `/app/*` routes have no
consent UI. That gap must close before any React route is cut over.

The legacy cookie is `_swapmyvote_cookie_consent`, scoped to `ENV["SERVER_HOST"]`,
and is documented on the Cookie Policy page (already ported to `/app/cookies`).

## Decisions

| Question | Decision |
| --- | --- |
| Reuse `cookieconsent@3` or write our own? | **Bespoke React component.** The library is unmaintained, imperative, and carries a11y problems we would inherit. The behaviour we need is ~60 lines. |
| How does the SPA learn the cookie domain? | **Meta tag in the `spa` layout.** Exact parity on name + domain + path means HAML and SPA share one cookie, so consent carries across the coexistence boundary in both directions. |
| Gate analytics on consent? | **Yes — behaviour change, accepted deliberately.** The SPA loads Google Tag Manager only after an explicit accept. |
| Banner buttons | **Accept + Decline.** Gating is meaningless without a way to refuse. |
| Gate the legacy HAML GTM partials too? | **Out of scope.** Filed as a follow-up so this change stays frontend-only. A user who declines on an SPA page will still get GTM on legacy pages until that lands. |

## Cookie contract

This is the correctness-critical part: the SPA must write *the same cookie* the
legacy library writes, not a same-named sibling.

- **Name**: `_swapmyvote_cookie_consent`
- **Domain**: `ENV["SERVER_HOST"]`, delivered to the SPA as a meta tag. When the
  value is blank the `domain` attribute is omitted entirely (host-only cookie),
  which is the correct degradation for local dev where the env var may be unset.
- **Path**: `/` — matches the library default.
- **Expiry**: 365 days via `max-age` — matches the library default.
- **`SameSite=Lax`**, and `Secure` when `location.protocol === "https:"`. The
  legacy library sets neither. Adding them changes nothing the legacy site
  depends on: the cookie is still first-party, still sent on top-level
  navigation, and still readable by `document.cookie` on both sides.

### Values

`cookieconsent@3`'s own vocabulary, so the legacy site interprets anything we
write as "already answered" and never re-prompts:

| Value | Written by | Meaning |
| --- | --- | --- |
| `dismiss` | legacy "OK" button | answered; analytics were running anyway |
| `allow` | SPA Accept | answered; analytics allowed |
| `deny` | SPA Decline | answered; analytics refused |

Derived predicates:

- `hasAnswered` — the cookie is present with any of the three values. Controls
  whether the banner renders.
- `analyticsAllowed` — value is `allow` **or** `dismiss`. A legacy "OK" already
  meant GTM ran for that user, so treating it as consent preserves their
  experience rather than silently downgrading it, and avoids re-prompting.

An unrecognised value is treated as unset: the banner shows and analytics stay off.

## Components

Each unit is independently testable and depends only on the one below it.

### `app/views/layouts/spa.html.haml`

Adds two meta tags inside `%head`, each rendered only when its env var is set:

- `cookie-consent-domain` → `ENV["SERVER_HOST"]`
- `google-tag-manager-id` → `ENV["GOOGLE_TAG_MANAGER_ID"]`

The only Rails change in this work.

### `app/frontend/lib/cookies.ts`

`readCookie(name)` and `writeCookie(name, value, options)` over `document.cookie`.
No dependency. Handles URI encoding and omits blank attributes. Knows nothing
about consent.

### `app/frontend/lib/cookieConsent.ts`

The cookie contract as code: the name, the `ConsentStatus` union, `readConsent()`,
`saveConsent(status)`, `analyticsAllowed(status)`, and `readConsentDomain()`
(the meta-tag lookup). Pure module, no React.

### `app/frontend/contexts/CookieConsentContext.tsx`

Provider holding the current status in state, seeded from `readConsent()` on
mount. Exposes `{ status, hasAnswered, analyticsAllowed, accept, decline }`.
`accept`/`decline` write the cookie and update state, so the banner disappears
and the analytics loader reacts in the same render pass. `useCookieConsent()`
throws outside a provider.

### `app/frontend/components/cookieConsent/CookieConsentBanner.tsx`

Fixed-bottom bar, hidden entirely once `hasAnswered`. Content: "We use cookies to
improve your experience.", a `<Link>` to `STATIC_PATHS.cookies`, and Accept /
Decline buttons.

a11y: an `<aside>` (implicit `complementary` landmark) with an `aria-label`,
placed last in the DOM. It is **not**
a dialog — no `aria-modal`, no focus trap, no focus stealing. Both buttons are
real `<button>`s, reachable by keyboard in document order, so the banner never
blocks access to page content (ties into the axe work in #1038).

Styling: Bootstrap utilities plus a co-located `CookieConsentBanner.module.scss`
for the fixed positioning and z-index only. SPA brand colours, not the legacy
teal/yellow palette.

### `app/frontend/components/analytics/GoogleTagManager.tsx`

Renders nothing. On mount and on consent change, if `analyticsAllowed` and the
GTM id meta tag is present, injects the `gtm.js` script once (guarded by a
module-level flag, since the script cannot be un-injected). No `<noscript>`
iframe — the SPA requires JS to render at all.

### `app/frontend/app/App.tsx`

`CookieConsentProvider` wraps the router. `Layout` renders `<GoogleTagManager />`
and `<CookieConsentBanner />` after `<Footer />`.

## Data flow

```
spa.html.haml meta tags
  └─> cookieConsent.ts (domain, GTM id) ─┬─> CookieConsentContext (status, actions)
document.cookie ──> readConsent() ───────┘        ├─> CookieConsentBanner (render / accept / decline)
                                                  └─> GoogleTagManager (inject when allowed)
                    saveConsent() <───────────────┘
```

## Error handling

- Missing or blank meta tags: `domain` attribute omitted; GTM never injected.
  Neither is an error, both are the correct local-dev state.
- `document.cookie` unavailable or throwing (hardened privacy settings): treat
  consent as unset, show the banner, keep analytics off. The click handlers
  swallow write failures and still update in-memory state, so a user is not stuck
  with an undismissable banner within a session.
- Unrecognised cookie value: treated as unset (above).

## Testing

Vitest + React Testing Library, co-located `*.test.tsx` / `*.test.ts`:

- **`cookies`** — round-trips a value; emits `domain`/`path`/`max-age`/`SameSite`;
  omits `domain` when blank; returns `null` for an absent cookie.
- **`cookieConsent`** — maps each cookie value to its status; unknown value reads
  as unset; `analyticsAllowed` true for `allow` and `dismiss`, false for `deny`;
  `saveConsent` writes the exact legacy name and the domain from the meta tag.
- **`CookieConsentBanner`** — renders when no cookie is set; does **not** render
  when the cookie holds `dismiss` (the legacy-consent case); Accept hides it and
  persists `allow`; Decline hides it and persists `deny`; the policy link points
  at `STATIC_PATHS.cookies`; the landmark has an accessible name; both buttons are
  in the keyboard tab order.
- **`GoogleTagManager`** — no script when consent is unset or `deny`; script
  injected once when `allow`; no script when the GTM id meta is absent.

No Rails specs: the layout change is two conditional meta tags with no
controller or model behaviour behind them.

## Out of scope

- Gating the legacy HAML GTM partials on the consent cookie (follow-up issue).
- A cookie-preferences UI for changing an answer after the fact. Neither the
  legacy site nor this design offers one; clearing the cookie re-prompts.
- Any change to the Cookie Policy page copy.
