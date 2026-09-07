# Upgrade swapmyvote from Rails 6.1 to Rails 8.1

## Context

swapmyvote runs **Rails 6.1.7.9** on Ruby 3.3.12. Rails 6.1 last saw a release in October 2024 (6.1.7.10) and is long past end of life, so its advisories will never be fixed.

The dependency-security pass in [#1066](https://github.com/swapmyvote/swapmyvote/pull/1066) cleared **113 of the 129 open Dependabot alerts** — every npm alert, and every gem alert that Rails 6.1 does not gate. The remaining **16 alerts (2 critical)** are all in `actionpack`, `actionview`, `activerecord`, `activestorage` and `activesupport`, plus `devise` (5.0.4 needs `railties >= 7.0`) and `sqlite3` (2.x is blocked by a `gem "sqlite3", "~> 1.4"` pin inside Active Record 6.1's own SQLite adapter). Every one of them needs a Rails version bump. That is the whole reason for this plan.

The app is small, which is what makes this tractable: roughly **2,000 lines of Ruby** — 13 models, ~25 controllers, 77 HAML views — behind **579 RSpec examples** with heavy snapshot coverage, plus 25 Playwright/axe specs.

**Decisions locked with the user:**
- **Target Rails 8.1, not 7.2.** See below — 7.2 is the oldest series still receiving security patches, so stopping there buys one release cycle before we are back here, and it costs nothing to go further.
- **Session invalidation is acceptable.** As of 2026-09-08 the site is between election cycles and not serving live voters, so logging every user out on deploy is a non-issue. This is what lets us skip cookie rotation and staged rollout, and it is the single biggest simplification in this plan. **It is a property of the quiet period, not of the project — re-confirm before reusing the assumption closer to an election.**
- **Do this now, not after the frontend cutover.** See **Sequencing against the frontend migration**.

---

## Target: Rails 8.1, not 7.2

The minimum version that clears all 16 alerts is 7.2.3.2. It is also the *floor*: the 2026-07-29 patch round shipped 7.2.3.2, 8.0.5.1 and 8.1.3.1 and nothing older — 7.1.6 and 7.0.10 were last touched in October 2025. Rails patches the three most recent series, so 7.2 drops off as soon as 8.2 ships.

Going further is free. The Gemfile resolves cleanly against **both** 7.2.3.2 and 8.1.3.1 from two constraint edits (`rails`, `rspec-rails`), with an identical gem set and nothing dropped or replaced — `coffee-rails`, `sassc-rails`, `uglifier` and `jquery-rails` all still resolve on 8.1. Ruby 3.3.12 satisfies both (`>= 3.1.0` and `>= 3.2.0` respectively).

Both targets pull `devise 5.0.4` and `sqlite3 2.9.6` along automatically, which is what clears the last four non-Rails alerts.

---

## What we measured before planning

The four things that usually make a 6.1 upgrade expensive were each probed on the current codebase rather than estimated. All four came back close to free. Re-run any of these to re-check the assumption.

| Concern | Probe | Result |
|---|---|---|
| **Zeitwerk** — the classic autoloader is removed in Rails 7.0, and `load_defaults 5.2` means we are still on it | Set `config.autoloader = :zeitwerk` on 6.1, run `bin/rails zeitwerk:check` and the suite | **Passes.** Suite is 579 examples / 0 failures under zeitwerk. One exception, `app/mailers/previews/`, which step 1 found to be a **production boot failure** rather than a cosmetic one — see below |
| **Framework defaults** — `load_defaults 5.2`, and `config/initializers/new_framework_defaults_6_1.rb` is entirely commented out, so no 6.0 or 6.1 default has ever been adopted | Set `config.load_defaults 6.1`, run the suite | **4 snapshot failures**, all the same cause: the `utf8` hidden input disappearing from forms (`action_view.default_enforce_utf8 = false`). No code changes |
| **Deprecation warnings** | `config.active_support.deprecation = :stderr` is already on in test; grep the suite output | **Zero** |
| **Gem resolution** | `bundle lock --update` against `rails "~> 7.2.3"` and `rails "~> 8.1"` in a scratch copy | Clean at both. Two Gemfile edits |

Two related findings that remove risks worth naming:

- The app is **already on Haml 6.3.0**, so the Haml 5 → 6 rewrite is behind us. 6 → 7 (which comes with `haml-rails` 3.1.0) is a small step, and the view snapshots cover it.
- Under `~> 7.2.3` Bundler resolves the three-segment **`7.2.3`**, not `7.2.3.2` — which is still vulnerable. Pin as `gem "rails", "~> 7.2.3", ">= 7.2.3.2"`.

---

## Upgrade order

Four PRs. The staging is deliberate but light: with session invalidation off the risk list, the only reasons left to split are *keeping failures attributable* and *staying rollback-able*.

- **Step 1 — Zeitwerk and framework defaults, still on Rails 6.1.** ✅ **Landed in #1068.** Set `config.load_defaults 6.1` (which turns zeitwerk on by itself — no explicit `config.autoloader` line needed); moved `app/mailers/previews/` to `spec/mailers/previews/` and repointed `config.action_mailer.preview_path`; regenerated the four affected view snapshots; deleted the now-redundant `new_framework_defaults_6_1.rb`. **Highest-value PR in the plan** — it removes the mandatory Rails 7 blocker while still running on the Rails we ship today, so it is fully verifiable and trivially revertible.

  The mailer previews turned out to be a **latent production boot failure**, not the cosmetic mismatch scoped above. `app/mailers` is an eager-load root, so `previews/user_mailer_preview.rb` under it has to define `Previews::UserMailerPreview`. Rails papers over this by registering `preview_path` as its *own* autoload root — but only when `show_previews` is true, which in production depends on `MAILER_PREVIEWS`. So with previews off (the normal production case) eager loading raises `Zeitwerk::NameError` on boot. Checking this in development passes, because `show_previews` defaults to true there; `RAILS_ENV=test bin/rails zeitwerk:check` is what reproduces it.

  While moving the file, a pre-existing bug in it came to light (spotted in review on #1068): `swap_confirmed` was defined twice, so the second definition silently shadowed the first and the "partner consented to share their email" preview could never be viewed. The two are now `swap_confirmed_with_email_consent` and `swap_confirmed_without_email_consent`.
- **Step 2 — `rspec-rails` 4.0.1 → 6.1.x** (dragging `rspec-core` 3.9.3 → 3.13). ✅ **Landed in #1069**, and needed no spec changes. Test-only, but broad enough that it should not share a PR with a framework bump — a failure here must not be mistaken for a Rails failure. **6.x is as far as Rails 6.1 allows**: `rspec-rails` 7.x requires `railties >= 7.0` and 8.x requires `>= 7.2`, so the jump to 8.x is a second hop taken in step 3, once Rails is there.
- **Step 3 — Rails 7.2.3.2 and `load_defaults` 7.2**, with `gem "rack", "~> 2.2"` pinned (see below). ✅ **Landed in #1070.** Devise 4.9.4 → 5.0.4, sqlite3 1.7.3 → 2.9.6 and `rspec-rails` 6.1.x → 8.0.4 came with it, and `bundler-audit` reports **no vulnerabilities**. Four small code changes were needed, none of them behavioural: `config.fixture_path` → `fixture_paths` (rspec-rails 7), `config.action_mailer.preview_path` → `preview_paths` (Rails 7.1), `enum provider: {...}` → `enum :provider, {...}` (keyword form is removed in Rails 8, so this was a step-4 blocker found early), and six view snapshots regenerated for Rails 7 helper output — attribute ordering, plus `favicon_link_tag` emitting `rel="icon"` instead of `rel="shortcut icon"`. The `require "logger"` shim in `config/boot.rb` was removed, as its own comment asked, now that Rails no longer depends on concurrent-ruby for it.

  Two things surfaced that the probes could not have: Rails 7.2's SQLite adapter sets its own default pragmas, where 6.1 set none. `journal_mode` now defaults to WAL, which writes `-shm`/`-wal` sidecars next to the database that `.gitignore` did not cover, so they are added there. And SQLite write contention became visible in the Playwright suite — workers run in parallel and each seeds through `bin/rails runner` while the server is also writing, which started failing with `SQLite3::BusyException: database is locked`, taking a different spec down on each run. The suite now runs `workers: 1`; that costs about 30s on a one-minute suite and removes the flake completely. This matters for CI as well as locally, because the Playwright job drives the development stack on SQLite.
- **Step 4 — Rails 8.1.3.1 and `load_defaults` 8.1**, unpinning Rack and letting Rack 3 land. ✅ **Landed in #1071.** Rack 2.2.24 → 3.2.7 needed **no code changes** — the middleware stack (airbrake, OmniAuth, `vite_rails`, `invisible_captcha`) came through untouched, and the suite, `yarn e2e` and a booted app on both pipelines are all green. `omniauth-rails_csrf_protection` was unpinned from `~> 0.1` (a 2020 release) to `~> 2.0`: its 0.1.2 `token_verifier.rb` includes `ActiveSupport::Configurable`, which Rails 8.1 deprecates and 8.2 removes, so this was the app's only remaining deprecation warning and a future blocker.

Keep the intermediate 7.2 stop even though the app is small, for a reason unrelated to sessions: Rails signposts each removal as a deprecation in the version *before* it lands, so jumping 6.1 → 8.1 directly trades warnings for unexplained hard failures. The suite emits zero deprecations today, which makes that signal clean and worth spending.

---

## Deferring Rack 3

Rack 2 → 3 is the largest genuine behavioural change in this upgrade — downcased header names, stricter response-body semantics — and it reaches the airbrake middleware, OmniAuth, Devise, `invisible_captcha` and `vite_rails`.

It is also **optional**. Both targets accept Rack 2: Action Pack 7.2.3.2 requires `rack >= 2.2.4, < 3.3` and 8.1.3.1 requires `rack >= 2.2.4`. Pinning `gem "rack", "~> 2.2"` through step 3 keeps the alert-clearing PR free of the one change most likely to break something subtly, and confines Rack 3 to step 4 where it is the only variable. Verified: the full Gemfile resolves on Rails 7.2.3.2 with Rack pinned to 2.2.24.

**Outcome:** Rack 3.2.7 landed in step 4 with **no code changes at all**. Deferring it cost one line of Gemfile and was still the right call — had something broken, it would have broken alone rather than inside the PR that clears the security alerts.

---

## Sequencing against the frontend migration

The [frontend modernization](frontend-modernization-plan.md) has M8 (vote + share) and M9 (cutover) outstanding. M9 deletes the legacy Sprockets stylesheets, the CoffeeScript, the two jQuery entrypoints and `application.html.haml` — so it is tempting to wait for it and shrink the surface first.

**Don't.** The intuition that the legacy Sprockets/CoffeeScript/HAML stack is what makes a Rails upgrade hard does not survive the resolution spike: `coffee-rails 5.0.0`, `sassc-rails 2.1.2`, `uglifier 4.2.1`, `jquery-rails 4.6.1` and `sprockets 4.4.1` all resolve on Rails 8.1 unchanged. Waiting would remove perhaps a day of work while leaving two critical alerts open for the whole of M8 plus M9.

The quiet period is worth more than the sequencing. Doing this while nobody is mid-swap is a bigger de-risk than any ordering choice in this document.

The two efforts do not otherwise collide: this plan touches `config/`, the Gemfile and the spec suite; M8 touches `app/frontend/` and `app/controllers/api/v1/`.

---

## Key risks and de-risking

1. ~~**Devise 4.9.4 → 5.0.4** on a live auth system.~~ **Landed in step 3 (#1070) with no code changes**, and `playwright-tests/auth.spec.ts` (sign-up, log out, log back in, wrong-password refusal) passes. **Still worth a manual pass before deploying**: the e2e specs cover email/password only, so password reset and a social round-trip through `Users::OmniauthCallbacksController` are unexercised, and step 4 moved `omniauth-rails_csrf_protection` across two majors.
2. ~~**Rack 3, in step 4.**~~ **Landed in #1071 with no code changes.** The airbrake middleware, OmniAuth, `invisible_captcha` and `vite_rails` all came through untouched.
3. ~~**Sprockets, CoffeeScript and sassc at runtime.**~~ **Verified.** The booted app serves `/`, `/faq` and `/users/sign_in` (Sprockets) alongside `/app/ping` (Vite) on both 7.2 and 8.1.
4. **`rspec-rails` 4 → 8 is four majors, taken in two hops.** **Settled.** The 4.0.1 → 6.1.5 hop in step 2 needed no spec changes at all. The 6.1.5 → 8.0.4 hop in step 3 needed exactly one: `config.fixture_path =` became `config.fixture_paths = [...]` in `spec/rails_helper.rb`, which rspec-rails 7 renamed. So the anticipated `rails_helper` churn was real but a single line, and it belonged to the second hop.
5. **Cookie invalidation at `load_defaults` 7.0** (`key_generator_hash_digest_class` SHA1 → SHA256) logs every user out. **Accepted** — see Context. `config.action_dispatch.cookies_serializer` is already `:json`, so the other half of this problem does not arise.

---

## Incidental findings

Not blockers, but worth folding in while we are here.

- **`require "rails/all"` loads four frameworks the app does not use** — Active Storage, Action Cable, Action Text and Action Mailbox. There is no attachment API anywhere in `app/`, and `db/schema.rb` has zero `active_storage` tables. Switching to selective requires would cut real attack surface, since both remaining criticals are Active Storage advisories. It would **not** clear the Dependabot alerts, though: `activestorage` stays in `Gemfile.lock` as a dependency of the `rails` meta-gem, and clearing them that way means listing the frameworks individually instead of using `rails` — not worth it.
- **Two orphan Active Storage migrations** (`20240609223702_add_service_name_to_active_storage_blobs`, `20240609223703_create_active_storage_variant_records`) exist with no `create_active_storage_tables` alongside them. Both guard on `table_exists?` and no-op'd, so they are harmless dead weight, not a latent failure.

---

## Verification

- **Run the suite against Postgres, not just SQLite.** This is the one that bit us: everything below was green on SQLite while CI's `test` job (which uses Postgres) failed 12 examples. `where("col IS ?", nil)` emits `IS $1` under Rails 7.2, which SQLite accepts and Postgres rejects as a syntax error. `docker run -d --rm -e POSTGRES_DB=rails_test -e POSTGRES_USER=rails -e POSTGRES_PASSWORD=password -p 5433:5432 postgres:16`, then `RAILS_ENV=test DATABASE_URL=postgres://rails:password@localhost:5433/rails_test bundle exec rspec`. `pg` needs Homebrew's libpq to build — see the gotcha in `AGENTS.md`.
- **Per step:** `bin/rake spec` (579 examples) and `bin/rake lint` green; `yarn lint`, `yarn typecheck`, `yarn test` unaffected but re-run at step 3 and 4 in case a Rails change reaches the SPA shell.
- **Set `SERVER_HOST=localhost`** when running the suite locally, as CI does — without it ten specs fail on `Missing host to link to!` and mask real regressions.
- **Boot the app, don't just resolve it.** At each of steps 3 and 4, run `foreman start -f Procfile.dev` and load both a legacy HAML page (`/users/sign_in`) and an SPA page (`/app/ping`) — the Sprockets and Vite pipelines are the parts a green suite does not exercise.
- **`yarn e2e`** (25 Playwright/axe specs) at steps 3 and 4; it drives real auth, so it is the cheapest check on the Devise 5 bump.
- **`bundle exec bundler-audit check --update`** at the end of step 3 should report clean. That is the definition of done for this plan.
- **Alert count:** confirm on the Dependabot page that all 16 are closed after step 3 deploys.

---

## Left for later

- **The Playwright suite runs `workers: 1`.** Rails 7.2 exposed SQLite write contention in the parallel seeds (`SQLite3::BusyException`); Rails 8.1 fixes that specific cause by beginning SQLite transactions as IMMEDIATE, and the BusyExceptions are gone. What still fails about one parallel run in three is inside `playwright-tests/profile.spec.ts`: `seedProfileUser()` is called once at module scope, and both tests in its `profile screen` block mutate that one user — one changes the offered party, the other the email — so they race each other. Giving those two tests their own fixture rows would let parallelism come back and save ~30s a run.
- **`require "rails/all"` still loads Active Storage, Action Cable, Action Text and Action Mailbox**, none of which the app uses. Now that the advisories are closed this is no longer urgent, but selective requires would still cut boot time and attack surface.
- **The `net-http`, `csv`, `mutex_m` and `drb` entries in the Gemfile** are shims the comment above them describes as "probably removable when upgrading beyond Rails 6.1". They were left alone deliberately — they are harmless, and removing them is a separate change with its own verification.
