# Modernize swapmyvote Frontend → Vite + React 19 + TypeScript SPA (tacticalvote-style)

## Context

swapmyvote is a stateful Rails 6.1 app (SQLite dev / Postgres prod) that matches voters for tactical vote-swapping. Today it is server-rendered HAML + jQuery/CoffeeScript on Bootstrap 4 (via CDN), with Devise + OmniAuth (Twitter/Facebook) auth, SMS OTP (MessageBird), a rich swap-lifecycle domain in `User`/`Swap`/`PotentialSwap`/`Poll`, mailers, an admin area, and **no JSON API** — every controller ends in `redirect_to` + `flash`. A five-phase operational engine (`AppModeConcern`, driven by `ENV["SWAPMYVOTE_MODE"]`) gates almost every action.

We want to modernise the frontend to React styled like the sister project **tacticalvote** (Bootstrap 5.3 + react-bootstrap, Rubik Bold uppercase headings, magenta `#ff66ff` primary, per-party colour classes, Biome + Vitest + Playwright), **keeping the existing backend, database, and swapping model unchanged**.

**Decisions locked with the user:**
- **Architecture:** Rails becomes a JSON API; a standalone **Vite + React 19 + TypeScript** SPA consumes it. During migration the SPA is served **same-origin, mounted inside Rails via `vite_rails`**, so Devise session cookies, CSRF, and OmniAuth redirects work with no cross-origin complexity. This establishes a clean FE/BE boundary from day one (separate engineers), while deferring the *physical* split (SPA on its own deploy + cross-origin auth) to a later, small final step — no double migration.
- **Rollout:** Incremental *build*, single *cutover*. Screens are ported one at a time, but no canonical route ever switches to React on its own — every migrated screen is served behind an `/app/*` preview prefix while its real path keeps serving HAML. Old HAML and new React coexist behind the same Rails app until every screen is ported, tested and approved, at which point the whole site flips at once. See **Cutover strategy** below.
- **Keep the entire existing site in place until switchover.** The current HAML site stays **fully functional and live** — nothing is removed, retired, or degraded — while the React site is built alongside it. New React pages are added without deleting their HAML equivalents, and we do not cut any route over to React until the entire site's replacement is complete, verified and approved — at which point they all switch together. No legacy code (HAML views, Bootstrap 4, Sprockets) is deleted until after a successful cutover. (Webpacker is the one exception, and not a violation: its two jQuery widgets were moved verbatim to Vite entrypoints, so the HAML pages that use them are unchanged and still live — see **Webpacker removal** below.) See **Cutover strategy** below.
- **Tooling:** Full tacticalvote toolchain — TypeScript, Bootstrap 5.3 + react-bootstrap, selective-partial-import `globals.scss`, CSS Modules, Rubik local font, Biome, Vitest + RTL, Playwright + axe. Rails keeps RSpec for the backend/API.

**Domain models stay unchanged** and are surfaced through serializers: `app/models/user.rb`, `swap.rb`, `potential_swap.rb`, `poll.rb`, `ons_constituency.rb`, `party.rb`, `identity.rb`, `mobile_phone.rb`. Mailers stay server-side.

---

## Toolchain setup

- **SPA lives in `app/frontend/`** (Vite Ruby default), cleanly separate from legacy `app/assets/` (Sprockets) so the two coexist during migration.
- Add `gem "vite_rails"`; run `bundle exec vite install` (generates `config/vite.json`, `bin/vite`, `Procfile.dev`). The `webpacker` gem has since been removed (see **Webpacker removal**).
- JS deps: `react@^19`, `react-dom@^19`, `react-router-dom@^7`, `bootstrap@^5.3.3`, `react-bootstrap@^2.10`, `react-icons`, `sass`, `@tanstack/react-query@^5`. Dev: `typescript` (`~5.7`, or `^6` if GA), `vite`, `vite-plugin-ruby`, `@vitejs/plugin-react`, `@biomejs/biome@2.4`, `vitest@^4`, `@testing-library/react@^16` + `dom`/`jest-dom`/`user-event`, `jsdom`, `@playwright/test`, `@axe-core/playwright`, `@types/*`.
- Bump `.nvmrc` 16→22 and `package.json` `engines.node`. Stay on Yarn 3.8 initially (bump to 4 later — don't couple to this migration).
- **Config files (repo root):** `vite.config.ts` (`RubyPlugin()` + React plugin + `@`→`app/frontend` alias); `tsconfig.json` (adapt tacticalvote's — drop Next plugin, `jsx: react-jsx`, `moduleResolution: bundler`, `paths: {"@/*": ["./app/frontend/*"]}`); `biome.json` (port tacticalvote's, strip Next-specific rules; applies to the TS/React tree only — leave rubocop/scss_lint/haml_lint for Ruby); `vitest.config.ts` (jsdom env, `app/frontend/**/*.test.tsx`); `playwright.config.ts` (webServer = Rails + Vite on port 3000, specs in `playwright-tests/`).
- **SCSS/brand:** copy tacticalvote's `app/globals.scss` almost verbatim to `app/frontend/styles/globals.scss` — selective Bootstrap partial imports, `$primary: #ff66ff`, `.party-*` colour system, uppercase headings. Rubik: `@font-face` on `app/frontend/assets/fonts/Rubik-Bold.ttf` → `--font-rubik` → `$headings-font-family` (replaces `next/font/local`).
- **Rails wiring for coexistence:** new minimal `app/views/layouts/spa.html.haml` renders `vite_client_tag` + `vite_typescript_tag "application"` + `csrf_meta_tags` + OG/meta (ported from `application.html.haml`) + empty `#root`. Existing `application.html.haml` (Bootstrap 4 CDN + Sprockets) stays as the layout for **un-migrated** HAML routes. Bootstrap 4 and 5 never load in the same document.

Reference: `/Users/stephenbaxter/Code/tacticalvote/app/globals.scss` and `/Users/stephenbaxter/Code/tacticalvote/biome.json`.

---

## Code sharing with tacticalvote (TV)

We investigated what's worth sharing between the two apps. Conclusion: **share the visual/brand layer by copy-and-adapt (already in the plan); do NOT share postcode lookup as a service.**

- **Postcode lookup — keep postcodes.io, do not couple to TV.** swapmyvote already resolves postcodes via the free, maintained public **postcodes.io** API (`app/frontend/entrypoints/postcodesHelper.js` reads `codes.parliamentary_constituency_2024` — the exact ONS code it keys on) and has no backend lookup service. TV's `/api/lookup` is not a shareable service: no CORS, unversioned (returns TV-specific `slug` first), a hidden `DC_API_KEY` (Democracy Club) dependency for multi-constituency/address cases, and Next.js-serverless-bound (Vercel `maxDuration`/512 MB). Consuming it would add a fragile runtime dependency on another team's app — a downgrade. In M3 we simply reimplement the ~90-line jQuery helper as a React `PostcodeLookup` component **still calling postcodes.io**.
- **TV's `data/postcodes.db` is a possible fallback, not a recommendation.** Its `pcon.gss` column ≡ swapmyvote's `ons_id` (drop-in, zero mapping; Ruby can read the SQLite via the `sqlite3` gem). But TV itself flags the DB as out-of-date with **no regeneration script in the repo** — not worth swapping a live maintained API for a stale 68 MB binary. Only consider it if we ever need to drop the postcodes.io runtime dependency, and only if we own a refresh pipeline (ONSPD/Democracy Club).
- **Shared npm package — not now.** swapmyvote is Ruby/Rails (can't consume a Node package server-side) and TV has no packaging infra (`private: true`, no `exports`/workspaces). TV's branding modules (`utils/branding.ts`, `utils/Party.ts`) are app-specific (bound to TV's `PartySlug` union, per-brand env, its Bootstrap CSS vars) — borrow the SCSS **patterns and party-colour values**, not the modules. A shared frontend design-system package (brand SCSS + common components like `PostcodeLookup`/party swatches) becomes viable **only after** swapmyvote's SPA is standalone (the end-goal split, when both are React/Node apps) — flag as a future opportunity, out of scope now.
- **Free interop win:** both apps key parliamentary constituencies on **ONS GSS codes**, so they're already data-compatible for any future cross-app feature (shared analytics, cross-linking) with no mapping layer.

---

## API layer

- **Versioned namespace `/api/v1`** under `app/controllers/api/v1/`, all inheriting `Api::V1::BaseController`. Controllers: `SessionController`, `SwapsController`, `UsersController`, `ConstituenciesController`, `PartiesController`, `VoteController`, `MobilePhoneController`, `PrePopulateController`. Legacy top-level `ApiController` (redirect helper) untouched.
- **Auth = reuse Devise session cookies.** Same-origin means the existing session cookie + Warden authenticate `/api/v1/*` with zero new auth code; `current_user` works as-is. **Do NOT switch API controllers to `null_session`** — that drops the logged-in user.
- **CSRF:** keep `protect_from_forgery with: :exception`. SPA reads the token from `<meta name="csrf-token">` (rendered by `csrf_meta_tags`) and sends `X-CSRF-Token` on every non-GET, plus `credentials: "same-origin"`. Centralize in `app/frontend/lib/csrf.ts` + an `apiClient` fetch wrapper.
- **Email/password login:** override Devise `Users::SessionsController#create` / `RegistrationsController#create` to `respond_to :json` (payload + 200/422), keeping existing HTML branches until legacy pages retire.
- **OmniAuth (social) is a full-page redirect, not XHR:** React social buttons are POSTs to `/users/auth/:provider` (CSRF-protected form). `Users::OmniauthCallbacksController` redirects back to a SPA route, which re-hydrates via `GET /api/v1/session`. Pre-login party-stashing stays server-side (session), mirroring today's `pre_login`.
- **SMS OTP:** port `MobilePhoneController` → `Api::V1::MobilePhoneController` (`POST .../verifications` send, `POST .../verifications/confirm`); map `verify_failure_reason` messages to a JSON `error.reason` the OTP component renders inline. MessageBird/Airbrake stay server-side.
- **Bootstrap/session endpoint (linchpin):** `GET /api/v1/session` returns `appMode`, `flags` (`loginsOpen`/`swappingOpen`/`votingOpen`/`votingInfoLocked` from `AppModeConcern`), `currentUser` (incl. `hasConstituency`, `mobileVerified`/`mobileSetButNotVerified`, `preferredParty`/`willingParty`), and `swap` (`state`, `confirmed`, `partner`, consent/email-share). Re-fetched after every mutation and on a poll so the SPA sees out-of-band changes.
- **Serializers: use Alba** (`app/serializers/api/v1/*_serializer.rb`) — explicit, testable, reused shapes (Blueprinter is an acceptable substitute; prefer either over jbuilder). Mirror every shape in `app/frontend/types/api.ts` (the FE/BE contract).
- **Error convention:** `{ "error": { "code", "messages", "fields" } }`. 401 unauthenticated, 403 `phase_forbidden`, 422 validation (from `errors.full_messages`), 409 swap-state conflict. Add `rescue_from` for `RecordInvalid`/`RecordNotFound` in `BaseController`.

---

## SPA architecture

- **react-router v7** (`createBrowserRouter`) in `app/frontend/app/App.tsx`, mounted by `entrypoints/application.tsx` into `#root`.
- **Coexistence contract:** add `SpaController#index` (`render layout: "spa"`, empty body). In `config/routes.rb`, route **only migrated paths** to it via an explicit allow-list (never a greedy `get "*"` — it would swallow HAML routes). react-router's route table stays in lockstep with that allow-list. Links across the SPA↔HAML boundary are full-page `<a href>`; within the SPA use `<Link>`.
- **State via Context + react-query.** `SessionContext` holds the `GET /api/v1/session` payload (single source of truth for auth/phase/swap) and exposes `refetchSession()`; `AppModeContext` derives the phase booleans. **react-query for server state** (session, potential swaps, parties, constituencies) — this is a deliberate divergence from tacticalvote (which is static) because swapmyvote's swap state is **live and changes out-of-band** (partner confirms/cancels, `Swap.cancel_old` expiry, regenerated potential swaps), needing polling / refetch-on-focus / cache-invalidation-after-mutation. No Redux.
- **Folder structure mirrors tacticalvote by feature:** `components/{navigation,footer,home,auth,swap,profile,mobile,vote,share,static}/`, `contexts/`, `lib/` (`apiClient.ts`, `csrf.ts`, `queryClient.ts`), `utils/` (`party.ts`, branding), `types/api.ts`. Component styles co-located `*.module.scss`; brand rules in `styles/globals.scss`. `utils/party.ts` maps `Party.smvCode` → `.party-*` class.

---

## Migration order (milestones)

Prove the toolchain on the lowest-risk surface, build the session backbone, then move inward to the core swap flow.

- **M0 — Toolchain spike.** Install vite_rails + configs, `SpaController#index` + `spa` layout, empty React app at a throwaway route rendering Rubik + magenta heading + Navigation/Footer. Proves Vite Ruby + Bootstrap 5 + font + HAML coexistence. Do the Node 16→22 bump here in isolation.
- **M1 — Static pages.** Port `static_pages` faq/about/contact/terms/cookies to React; prove routing, `<Link>` vs `<a>` boundary, axe. *(SEO caveat below.)*
- **M2 — Session bootstrap + Navigation.** `GET /api/v1/session` + `SessionContext` + react-query; Navigation shows logged-in/out + phase-aware (ports `_current_user`/`_login`). **Prove CSRF + session here** (one authed GET + one CSRF POST) before any feature.
- **M3 — Home / landing.** Port `home/index` + five phase partials + party/constituency entry form. Replace `postcodesHelper.js` (jQuery) with React `PostcodeLookup` + `ConstituencyAutocomplete`, **still calling postcodes.io** (see "Code sharing with tacticalvote"). API: `GET /api/v1/parties`, `GET /api/v1/constituencies`, `POST /api/v1/pre_populate`.
- **M4 — Constituency / profile edit.** ✅ **Landed.** Ported `user/constituencies` + `users#edit/update`: `/app/constituency` (new-account entry point, offers party/constituency + email when the account has none), `/app/profile` (preferred/willing party, constituency, email; a save that changes the willing party or constituency routes to `/app/review`), and `/app/review` (poll chart + interpretation, Proceed/Change). API: `Api::V1::UsersController#update`. The mobile number field is a read-only status line linking out to the legacy `/user/edit` page — it stays that way until M6 replaces `intlTelInput.js`. Covered by `playwright-tests/profile.spec.ts` and the signed-in block of `accessibility.spec.ts`.
- **M5 — Auth.** ✅ **Landed.** Ported login and sign-up: `/app/login` and `/app/signup`, backed by `POST /api/v1/session` and `POST /api/v1/registration`, both answering with the session payload so the SPA primes its cache from the response. **Email and password only** — the Twitter/Facebook buttons and the login modal this bullet used to promise were both deleted from the live site in `8a4b078` (June 2024, "we only support email now"); `Users::OmniauthCallbacksController`, the `/auth/*` routes and `Identity` are untouched, so existing social accounts still work. Registration reads the entry form's answers from `session[:pre_populate]` server-side, which is what finally connects the React entry form to a new account. `invisible_captcha` cannot cross to JSON, so the React form carries an equivalent hidden honeypot. Password reset stays on HAML. Covered by `playwright-tests/auth.spec.ts` and the logged-out block of `accessibility.spec.ts`.
- **M6 — Mobile verification.** Port `MobilePhoneController` → API; build a React phone input + OTP form to replace the `intlTelInput.js` pack. The React version supersedes the widget, but **leave `app/frontend/entrypoints/intlTelInput.js` in place** (the legacy HAML mobile page keeps using it) — removal happens only at cleanup, after cutover.
- **M7 — Core swap flow (heart).** Port `user/swaps#show/new/create/update/destroy` (find-a-swap list, choose/confirm/cancel, email-share consent) and `users/show` dashboard states (`_confirm_outgoing/incoming_swap`, `_swap_confirmed`). react-query polling matters most here. Marginal-score ranking/match generation stay in `User`/`Poll`. API: `Api::V1::SwapsController` + session refetch after each mutation.
- **M8 — Vote + share.** Port `user/vote#show/create` ("I've voted") and `user/share#show`.
- **M9 — Cutover.** Once every user-facing screen has a verified, approved React replacement, flip *all* canonical routes to the SPA in one step (see **Cutover strategy**). This is the first and only time a canonical route stops serving HAML. Only *after* a successful cutover: remove Bootstrap 4 CDN + Sprockets stylesheets, the two legacy jQuery entrypoints, CoffeeScript/`Gruntfile.coffee`, and retire `application.html.haml`. Admin (`admin#index/stats`) may stay HAML indefinitely (internal, low value) — if so, keep the minimal legacy layout it needs.

---

## Webpacker removal

Webpacker/webpack 4 was removed ahead of schedule, without touching the cutover policy.

Only two files were ever built by webpack — `postcodesHelper.js` and `intlTelInput.js` — and webpack 4 hashes with md4, which OpenSSL 3 (Node >= 17) dropped, so every `assets:precompile` needed `NODE_OPTIONS=--openssl-legacy-provider` in CI, on Heroku and in `app.json`.

Rather than wait for M3/M6 to replace them with React, both were moved **verbatim** to `app/frontend/entrypoints/` and are now built by Vite. Their HAML pages load them with `vite_javascript_tag` instead of `javascript_pack_tag`; the pages, the jQuery inside them and the routes they serve are all unchanged, so this is a build-tool swap, not a screen migration. jQuery still comes from the Sprockets bundle and is a global in both files.

Deleted: the `webpacker` gem, `@rails/webpacker`/`webpack`/`webpack-cli`/`webpack-dev-server`, `config/webpacker.yml`, `config/webpack/`, `config/initializers/webpacker.rb`, `bin/webpack*`, `app/javascript/`, and every `--openssl-legacy-provider` workaround.

One behavioural fix came with it. `intlTelInput.js` used to `import` intl-tel-input's `utils.js`, a Closure-compiled classic script that publishes `window.intlTelInputUtils` by assigning to top-level `this` — which is only `window` when it runs as a plain `<script>`. It now imports the file with Vite's `?url` suffix and hands the URL to intl-tel-input's own `utilsScript` option, so the library injects it as a script tag and the global is set properly. The phone-number checks are otherwise identical.

M3 and M6 still replace both widgets with tested React components; this only changed what bundles them.


## Cutover strategy — keep the existing site live until we switch

**Principle:** the current HAML site is the live, source-of-truth site throughout the migration. React is built *alongside* it and nothing legacy is removed until we deliberately switch over. This de-risks the whole effort: at any point we can ship (or roll back) because the old site is always intact.

- **Coexistence, not replacement, during M1–M8.** Building a React screen does **not** delete its HAML equivalent. Both exist; the `SpaController` route allow-list decides which one is served. Keep the HAML controller/view/routes for every screen until cutover.
- **One cutover, not many. This is settled, not a per-milestone choice.** No canonical route (`/`, `/faq`, `/user/swap`, …) switches from HAML to React until **every** screen is done, tested and approved. A finished, verified milestone is *not* a reason to flip its route. The live HAML site stays the source of truth for real users throughout, so we can ship or roll back at any point and never run a half-React/half-HAML site in production.
- **Until then, React ships behind `/app/*`.** Each migrated screen is routed to `SpaController` under a preview prefix (`/app/about`, `/app/ping`, …) while its canonical path keeps its HAML controller. `app/frontend/lib/staticPaths.ts` centralises those prefixed paths so cutover is a single edit: drop the `/app` prefix, repoint the Rails allow-list, retire the HAML controller.
- **Verify before cutover, screen by screen.** Each screen still has to pass its milestone's Vitest + RSpec request specs, the Playwright/axe checks, and manual end-to-end verification against the real flow. That verification is what earns a place in the cutover — it does not trigger one.
- **Defer all deletion to M9 cleanup, post-cutover.** No removal of HAML views, the legacy jQuery entrypoints, Bootstrap 4/Sprockets, or CoffeeScript until the new site is fully switched over and stable.
- **Final physical split is separate and later.** Moving the SPA to its own deploy (tacticalvote-style) is a post-cutover step and does not gate the above.

---

## Auth / phase gating

**Server stays the source of truth.** Re-implement every existing `before_action` guard (`require_login`, `require_swapping_open`, `require_logins_open`, `restricted_when_voting_open`, `assert_mobile_phone_verified`, `assert_has_email`, `assert_has_constituency`, `assert_*_swap_exists`) in `Api::V1::BaseController` — include a Ruby-side `AppModeConcern` (already works with `current_user`/`session`). Every API action independently enforces phase/auth/state and returns 401/403/409. **Never trust the client.**

**Client mirror (UX only, from `GET /api/v1/session` flags):** guard components `<RequireLogin>`, `<RequireSwappingOpen>`, `<RequireLoginsOpen>`, `<RequireMobileVerified>`, `<RequireProfileComplete>`. When `flags.votingInfoLocked` (`votingOpen && swap.confirmed`), disable edit-profile / change-parties / delete-account / cancel-swap controls (mirrors `restricted_when_voting_open` / `open-and-voting`). The five phases render distinct home UIs and toggle capabilities app-wide from the single `appMode`/`flags` object — no ENV on the client. The `?opensesame=` override stays a server concern (sets `session[:sesame]`, reflected in the session payload).

---

## Testing

- **Vitest + RTL** (`app/frontend/**/*.test.tsx`): component + guard behaviour (Navigation by flags, `SwapProfileCard` party colours, guard redirects, OTP error-per-reason). Mock `apiClient`/react-query with a test `QueryClient`.
- **Playwright + axe** (`playwright-tests/`): full swap E2E against running Rails+Vite (sign in → set constituency → verify mobile [`TEST_USERS_SKIP_MOBILE_VERIFICATION` / stubbed MessageBird] → pick swap → confirm from partner → cancel) + per-page a11y scans. Seed via existing FactoryBot factories / `db:seed`.
- **RSpec request specs** (`spec/requests/api/v1/`): status codes, serializer shapes (assert against `types/api.ts`), phase-gate enforcement (403 when swapping closed, 409 double-swap, 401 unauth), CSRF rejection. Keep existing model/feature specs green; retire HAML feature specs per screen as ported.
- CI lanes: `bundle exec rspec`, `yarn vitest run`, `yarn playwright`, `yarn biome check`, `tsc --noEmit`.

---

## Key risks & de-risking

1. **CSRF/session across the SPA (do first).** Prove in M2 with one authed GET + one CSRF POST; centralize in `apiClient`/`csrf.ts`; RSpec asserts forged-token rejection. Keep `:exception` (not `null_session`).
2. **OmniAuth redirect flow.** ~~It's a leave-the-SPA full-page POST, not XHR; land the callback on a SPA route that re-hydrates via session. Test Twitter+Facebook round-trip early in M5 with `Identity.from_omniauth` untouched.~~ Moot: the Twitter/Facebook buttons and login modal were removed from the live site in `8a4b078` (June 2024), before this migration started, so social login is no longer part of the migration's UI. `Users::OmniauthCallbacksController`, the `/auth/*` routes and `Identity` are untouched and out of scope for M5's React work — existing social accounts keep working through the legacy flow.
3. **Phase-gating drift** (logic in Ruby + React). Server authoritative; client reads flags only from the session endpoint; a Playwright test drives each `SWAPMYVOTE_MODE`/`?opensesame=` and asserts UI + API agree.
4. **Coexistence routing.** Explicit per-route allow-list to `SpaController#index` (no greedy `*`); separate `spa` layout never loads Bootstrap 4/Sprockets; full-page `<a>` at the boundary; keep react-router table synced with the Rails allow-list.
5. **Out-of-band swap state.** react-query polling + refetch-on-focus on dashboard/find-a-swap; API returns 409 with a `code` the SPA turns into "this swap changed, refreshing"; always refetch session after mutations.
6. **SEO of client-rendered pages.** A client-rendered SPA loses server HTML — for the static pages, and more importantly for `/`, the site's front door. Because nothing flips until the single cutover (above), production keeps its SSR HAML throughout the build, so this is a **cutover-gate question, not a per-milestone one**: it has to be answered before M9, not before shipping any given screen. The eventual standalone-SPA deploy restores SSR. **Still to confirm with the team, ahead of cutover.**
7. **Decommissioning jQuery/Coffee widgets.** `postcodesHelper.js` (postcode→constituency, `parliamentary_constituency_2024` lookup) and `intlTelInput.js` (phone validity) embed real validation — port as React components with unit tests replicating exact checks (M3, M6) before deleting the entrypoints. The webpack build is already gone; the widgets themselves are not.

**End-state cleanliness:** because Rails becomes a pure `/api/v1` JSON provider consumed via `apiClient` over same-origin cookies, the later move to a standalone SPA deploy only requires swapping the cookie/CSRF strategy for token/CORS in `apiClient.ts` + `BaseController` — no component or controller-logic rewrites.

---

## Verification

- **Per milestone:** `yarn biome check` + `tsc --noEmit` clean; `yarn vitest run` green for new components; new `spec/requests/api/v1/` request specs green (`bundle exec rspec`); existing model/feature specs stay green.
- **End-to-end (from M2 onward):** run `foreman start -f Procfile.dev` (Rails + Vite), then drive the migrated screen in the browser. From M7, run the Playwright swap E2E: sign in → set constituency via postcode → verify mobile → pick a potential swap → confirm from the partner account → cancel; assert dashboard reflects each state and axe reports no violations.
- **Phase gating:** launch with each `SWAPMYVOTE_MODE` (and `?opensesame=`), confirm the home UI + available actions match the mode and that the API rejects (403/409) any action the UI would hide.
- **Auth:** exercise email/password login + registration (JSON) and both Twitter and Facebook round-trips, confirming the callback returns into the SPA and `GET /api/v1/session` hydrates the logged-in user.
