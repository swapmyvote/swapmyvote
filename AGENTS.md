# AGENTS.md

Guidance for AI agents (Claude Code, Gemini CLI, opencode, etc.) working in the **swapmyvote** repository. `CLAUDE.md` and `GEMINI.md` are symlinks to this file.

Some conventions here are ported from the sibling repo **tacticalvote** (`../tacticalvote/AGENTS.md`), which shares the Forward Democracy brand and frontend stack.

## What this project is

swapmyvote is a **Ruby on Rails 6.1** app (Ruby 3.3.2; SQLite in dev/test, Postgres in prod) that matches voters who want to swap votes tactically. Core domain lives in `app/models/` (`user.rb`, `swap.rb`, `potential_swap.rb`, `poll.rb`, `ons_constituency.rb`). Auth is Devise + OmniAuth (Twitter/Facebook) with SMS OTP via MessageBird. A five-phase operational engine (`app/controllers/concerns/app_mode_concern.rb`, driven by `ENV["SWAPMYVOTE_MODE"]`) gates most actions.

### Frontend modernization (in progress)

The frontend is being migrated from server-rendered HAML + jQuery/CoffeeScript to a **Vite + React 19 + TypeScript SPA** styled like tacticalvote (Bootstrap 5.3 + react-bootstrap, Rubik Bold uppercase headings, magenta `#ff66ff` primary, per-party colour classes). Rails is becoming a JSON API under `/api/v1`; the SPA is served **same-origin via `vite_rails`** during migration so Devise sessions, CSRF, and OmniAuth redirects work without cross-origin complexity. Rollout is **incremental, route-by-route** — old HAML and new React coexist.

- SPA source: `app/frontend/` (`@/*` path alias → `app/frontend/*`).
- Brand styles: `app/frontend/styles/globals.scss` (ported from tacticalvote); component styles as co-located `*.module.scss`.
- Coexistence: migrated paths render the `spa` layout (`app/views/layouts/spa.html.haml`) via `SpaController#index`, routed from an **explicit allow-list** in `config/routes.rb`. Keep the react-router route table (`app/frontend/app/App.tsx`) in lockstep with that allow-list. Legacy paths keep their HAML controllers + `application.html.haml` (Bootstrap 4 CDN). The two Bootstraps never load in the same document.
- The full plan, milestone list, and cutover strategy live in [`docs/frontend-modernization-plan.md`](docs/frontend-modernization-plan.md). **The existing HAML site stays fully live until each route's React replacement is verified and switched over; no legacy code is deleted until after cutover.**

## Development commands

### Frontend (Node 22, Corepack/Yarn — see `.nvmrc`, `packageManager`)

```bash
corepack yarn install     # install JS deps
bundle exec vite dev      # Vite dev server (:3036)
bin/rails s -p 3000       # Rails (:3000) — serves the SPA shell + API
foreman start -f Procfile.dev   # both at once

corepack yarn typecheck   # tsc --noEmit — MUST PASS
corepack yarn lint        # biome check app/frontend — MUST PASS
corepack yarn lint:fix    # biome check --write app/frontend
corepack yarn test        # vitest run (component tests) — MUST PASS
corepack yarn e2e         # playwright (E2E + axe; needs the dev stack running)
```

Lint/format is **Biome** (`biome.json`), scoped to the `app/frontend` tree. Ruby tooling (rubocop, scss_lint, haml_lint) is unchanged.

### Backend (Rails)

```bash
bundle exec rspec         # backend + API request specs — MUST PASS
bundle exec rubocop       # Ruby lint
bin/rails db:prepare      # create + migrate dev DB
```

### Local environment gotchas

- **Ruby**: the project pins **3.3.2** via rbenv (`.ruby-version`), but a newer system Ruby may shadow the rbenv shims. Prefix commands so the pinned Ruby wins, e.g. `PATH="$HOME/.rbenv/shims:$PATH" bundle exec …`, or use `rbenv exec`.
- **Vite CLI**: use `bundle exec vite …` (not `bin/vite`) — `bin/vite`'s Bundler-binstub check can fail depending on how binstubs were generated. `Procfile.dev` already uses `bundle exec vite`.
- **Legacy Webpacker packs** (`app/javascript/packs/*`) are built by webpack 4, which fails on Node ≥17 with an OpenSSL 3 error (`digital envelope routines::unsupported`). This breaks legacy HAML pages that still use `javascript_pack_tag` (e.g. the home page's `postcodesHelper`). It is unrelated to the Vite SPA and is resolved as those packs are ported to React (then the `webpacker` gem is removed).

## Git & branch policy

- **Never push directly to `master`** (the default branch). All changes go through a pull request.
- Always work on a feature branch with a **meaningful name** that describes the change (e.g. `frontend-vite-react-toolchain`, `fix-swap-confirm-race`). **Do not** open PRs from auto-generated names like `claude/frontend-react-modernize-cf78b7` — rename first (`git branch -m <good-name>`).
- Always push with an explicit remote + branch: `git push -u origin <branch>`. Never bare `git push`.
- Confirm which branch you're on before pushing.
- When a PR closes an issue, use GitHub auto-closing keywords in the description (`Closes #123`, `Fixes swapmyvote/swapmyvote#456`).
- "commit this" / "git isn't synced" means commit — it does **not** authorize pushing to `master`.

## Frontend conventions

- **Always add tests for new or changed code.** React components → React Testing Library + Vitest (`*.test.tsx` co-located). New API endpoints → RSpec request specs under `spec/requests/api/v1/`. Don't skip tests by calling code "trivial" or "presentational."
- **TypeScript style**: always use braces in `if`/`else`/`for`/`while` bodies, even single-statement. No `if (foo) return null;`.
- **Styling**: prefer Bootstrap utility classes (`d-flex`, `w-100`, `text-center`, `p-0`, …) over custom CSS. Don't use inline `style={{…}}` unless the value is dynamic (derived from state/props/runtime); static styles go in a co-located `*.module.scss` or, if shared, `app/frontend/styles/globals.scss`.
- Mirror tacticalvote's structure: components grouped by feature (`app/frontend/components/<feature>/`), `lib/`, `utils/`, `contexts/`, `types/`.

## Before committing (quality gates)

Run and ensure all pass:

```bash
corepack yarn lint:fix    # auto-fix Biome issues
corepack yarn typecheck   # tsc
corepack yarn test        # vitest
bundle exec rspec         # if backend/API changed
```

Do not commit or open PRs with Biome lint/format issues, TypeScript errors, or failing tests. CI will fail.
