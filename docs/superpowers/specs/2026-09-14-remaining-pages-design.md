# M9 + M10: the remaining pages

Design for the last two build milestones of the React migration — every
user-facing screen still served only by HAML. After these, nothing is left to
port and the only work before cutover is the SEO question and the E2E
flakiness.

Supersedes nothing. Renumbers the plan's **M9 — Cutover** to **M11**.

---

## Why two milestones

Five screens remain. They split on a real line rather than on page count:

| | Screens | New API | Risk |
|---|---|---|---|
| **M9** | FAQ, API docs | none (two serializer fields) | content only |
| **M10** | password reset ×2, confirm deletion, account deleted | 3 endpoints | auth-adjacent, irreversible |

M9 cannot delete an account or let anyone into someone else's. M10 does both.
Bundling them would bury the review that matters under a 428-line markup
diff.

M9 also finishes work the plan already claimed. **M1's scope was "port
`static_pages` faq/about/contact/terms/cookies"** — the FAQ was dropped
without a note. This is unfinished M1, not new scope.

---

## M9 — Static content

### Screens

`components/static/Faq.tsx` and `components/static/ApiDocs.tsx`, both inside
the existing `<StaticPage>` wrapper, at `spaPaths.faq = "/app/faq"` and
`spaPaths.api = "/app/api"`. `/faq` and `/api` keep serving HAML until M11.

### FAQ anchors

The legacy view marks sections with `%a(name="legal")` — the HTML 4 named
anchor, dropped from HTML 5 but still honoured by browsers, which is why
`/faq#trust` works on the live site today. The port moves the anchor onto the
`<h2>` as an `id`, so the scroll target is the heading itself rather than an
empty element above it.

Anchors carried across: `legal`, `trust`, `privacy`, `independence`,
`parties`, `facebook-profile`, `trouble`, `constituencies`, `change`, `reset`,
`better`, `noone`, `deactivate`, `who`, `open`.

**Two content bugs are fixed rather than ported.**

1. `name="reset"` appears **twice** — on "My swap hasn't been confirmed; what
   should I do?" (line 256) and on "How can I reset or cancel my swap?"
   (line 287). Only the first is reachable. The id goes on the second, which
   is the section every `#reset` link means.
2. Line 270, inside the first of those sections, offers to "cancel your swap
   immediately ... as described below" and links to `#reset` — i.e. to itself.
   With the id moved it resolves to the section the prose describes.

### The dropped section

`#login` — "Why do I need to log in with Facebook / Twitter / email, and not
X?" — is **not ported**. It is gated on `log_in_with_facebook? ||
log_in_with_twitter?`, both of which default to true, so it renders on the
live site today, but the Twitter and Facebook buttons were deleted in `8a4b078`
(June 2024) and the React login is email-only. The FAQ's own `#trust` section
already says social login is unavailable, so the two sections contradict each
other.

`#facebook-profile` — "Why can't I reach my swap partner's Facebook profile?"
— **is** ported, unconditionally. Existing social accounts still authenticate
through the untouched callback controller, so partners who signed up that way
still have Facebook profile links and the troubleshooting still applies. It is
also the target of `ReachOutToSwap`'s `/faq#facebook-profile` link.

Neither section keeps its `log_in_with_*` gate. Carrying that flag to the
client would mean new API surface to serve a `DISABLE_LOG_INS` env var that is
set nowhere.

### Dynamic values

| HAML | React |
|---|---|
| `election_date_season_type` | `useElection().dateSeasonType` — already served |
| `contact_path`, `edit_user_path` | `spaPaths.contact`, `spaPaths.profile` |
| `github_url`, privacy policy | `lib/externalLinks.ts` — already there |
| `confirm_account_deletion_path` | **stays a full-page `<a>`** — see below |
| `swap_validity_hours` | **new** `ElectionSerializer` field |

`swap_validity_hours` is `ENV["SWAP_EXPIRY_HOURS"] || 48` and sits on no
payload. It goes on `ElectionSerializer` as `swapValidityHours`. This is a
deliberate smudge of that serializer's meaning — swap expiry is not a property
of the election — justified because `GET /api/v1/election` is already the
"deploy-immutable config the client caches forever" endpoint, and this is
exactly that. Noted here so it is a decision rather than a drift.

### Link repointing

Nine `href="/faq…"` links exist across `Footer`, `Contact`, `SignUpForm`,
`ProfileForm` and `ReachOutToSwap`. All become in-SPA links in this milestone.

This is the bug class M6 and M8 both got wrong and had to fix afterwards: a
screen is not ported until nothing links to its **legacy path**. It is part of
the milestone, not a follow-up.

Hash links need care. `ScrollToTop` deliberately watches only `pathname`, so a
`<Link to="/app/faq#trust">` would navigate without scrolling to the anchor.
`ScrollToTop` gains a guard: when `location.hash` is set, skip the scroll and
let the browser resolve the fragment.

**One link is deliberately left legacy.** The `#deactivate` section links to
`confirm_account_deletion_path`, which has no SPA route until M10. It stays a
full-page `<a href="/confirm_account_deletion">` with a comment naming M10 as
its owner, and M10 repoints it.

### API docs

Reads `useParties`, `useConstituencies` and `useElection`. No new endpoints.

One serializer addition: **`canonicalName` on `PartySerializer`**, mirroring
`ApplicationHelper#canonical_name`
(`parameterize(separator: "_").gsub(/_party$/, "")`). Reimplementing that
transform in TypeScript would give two definitions of the string the
`/swap?willing_party_name=` deep link matches on, free to drift apart.

The `_api_constituencies` partial renders only when `!general_election?`, so
the React version branches on `useElection().generalElection`.

Example URLs build from `window.location.origin`, so they are correct in
development as well as production.

**The random example party is kept.** `Party.all.sample` picks a different
party on every page load, which reads like an oversight but is load-bearing:
the FAQ calls the site "devotedly non-partisan", and a hard-coded party in the
integration documentation would look like an endorsement. The chooser is
injected as a prop defaulting to `Math.random`, so tests pin it without
changing the behaviour.

Note for readers of the HAML: the example URLs spell the party
`labour_party` while the documented list spells it `labour`. Both work —
`Api::V1::RegistrationController#party_id_for` applies `canonical_name` to the
**inbound** value as well, so the two forms converge. No fix needed.

### Tests

- Vitest for both components: every anchor id present, `#login` absent,
  `/faq` links resolved in-SPA, party list rendering canonical names, the
  constituencies block appearing only for a by-election.
- Vitest for `ScrollToTop`'s new hash guard.
- RSpec request specs covering `canonicalName` and `swapValidityHours`.
- An `accessibility.spec.ts` entry per page.

---

## M10 — Account lifecycle

### `POST /api/v1/password`

Body `{ email }`. Wraps `User.send_reset_password_instructions`. Mirrors the
`require_no_authentication` Devise prepends to its own `PasswordsController`
via `reject_when_logged_in!`.

No phase gate: the legacy Devise controller has none, and adding one would be
new behaviour rather than a port.

**Always answers 202**, whether or not the address is registered:

> If that address is registered, we've sent reset instructions.

This diverges from the live site. `config.paranoid` is off, so the HAML page
answers an unknown address with "Email not found" — an email-enumeration
oracle. A JSON endpoint is a far easier oracle to script against than a form,
so the new surface should not reproduce it.

The cost is real and accepted: someone who mistypes their address gets no
feedback and simply never receives the mail.

### `PUT /api/v1/password`

Body `{ token, password, passwordConfirmation }`. Wraps
`User.reset_password_by_token`. Also `reject_when_logged_in!`.

`config.sign_in_after_reset_password` is left at its default of true, so a
successful reset signs the user in and the endpoint answers with the **session
payload** — the same shape `POST /api/v1/session` returns, so the SPA primes
its cache by the same path it already uses after login.

Errors:

| Case | Status | Code |
|---|---|---|
| Token unknown, used, or older than `reset_password_within` (6h) | 422 | `invalid_token` |
| Password too short, or confirmation mismatched | 422 | `validation_failed` (with `fields`) |

### `DELETE /api/v1/user`

Guards `require_logged_in!` and `reject_when_voting_info_locked!`, mirroring
`UsersController#restricted_when_voting_open` — which today redirects
silently, giving the user no idea why nothing happened.

Then `current_user.destroy`, `reset_session`, and answer with the signed-out
session payload. (The legacy controller clears `session[:user_id]`, a
pre-Devise leftover that no longer holds the session.)

**The cascade already works and needs nothing here.** `User` declares
`before_destroy :clear_swap`, and `Swap` declares `before_destroy
:notify_users_of_cancelled_swap`, so the partner's cancellation email is sent
by the model layer. The confirmation page's promise — "this will cancel any
pending or confirmed swaps you have made" — is kept without controller code.

### Screens

| Path | Component |
|---|---|
| `spaPaths.passwordNew = "/app/password/new"` | `pages/PasswordNew.tsx` |
| `spaPaths.passwordEdit = "/app/password/edit"` | `pages/PasswordEdit.tsx` |
| `spaPaths.confirmAccountDeletion = "/app/account/delete"` | `pages/ConfirmAccountDeletion.tsx` |
| `spaPaths.accountDeleted = "/app/account/deleted"` | `pages/AccountDeleted.tsx` |

Mutations live in `lib/password.ts` and `lib/account.ts`, following
`lib/vote.ts`.

**Their canonical paths are not these paths minus `/app`.** The plan describes
cutover as "drop the `/app` prefix", which is already only a shorthand —
`spaPaths.home` is `/app/home` but cuts over to `/`, and `spaPaths.profile` is
`/app/profile` but replaces `/user/edit`. These four are the same, and the
mapping M11 applies is:

| `spaPaths` | canonical path at cutover |
|---|---|
| `/app/password/new` | `/users/password/new` (Devise) |
| `/app/password/edit` | `/users/password/edit` (Devise — what the mailer links to) |
| `/app/account/delete` | `/confirm_account_deletion` |
| `/app/account/deleted` | `/account_deleted` |

Stated here so M11 does not have to infer it.

`PasswordEdit` reads `reset_password_token` from the query string, so a real
token pasted from a development email drives the screen during preview.

The delete confirmation gets a genuine destructive-action treatment — a
`variant="danger"` button, not the legacy inline `style: "color: red"` link —
and is disabled when `flags.votingInfoLocked`, mirroring the server guard.

### The mailer link, and why it needs no change

Devise mails `edit_password_url(reset_password_token: …)` →
`/users/password/edit?reset_password_token=…`. That path keeps serving Devise
HAML until M11, so **live reset emails keep working throughout**. At cutover
`/users/password/new` and `/users/password/edit` are added to the
`SpaController` allow-list and the same URL lands on the React screen. The
mailer is never edited.

This is the standard coexistence pattern, and it is why the token screen can
be previewed at `/app/password/edit` without a second mailer template.

### Link repointing

Three legacy hrefs become in-SPA links here:

- `LoginForm.tsx` — `hamlForgottenPassword = "/users/password/new"`
- `ProfileForm.tsx` — `hamlDeleteAccount = "/confirm_account_deletion"`
- `Faq.tsx` — the `#deactivate` link M9 left behind

Plus a **guard against the whole bug class**: a Playwright assertion that no
screen under `/app/*` links to a path outside it that has an `spaPaths` entry.
M6 and M8 each shipped believing they had fixed the last such link, and each
was wrong, because the component tests asserted the buggy hrefs. A test that
does not need to be told which links to check is the only version that holds.

### Tests

- Request specs: all three endpoints; the 202-for-unknown-address behaviour
  asserted explicitly as a decision, not an accident; expired and reused
  tokens; deletion refused under `votingInfoLocked`; deletion cascading to the
  swap and sending the partner's email.
- Vitest for the four screens, including `PasswordEdit` with a missing token.
- Playwright: the full reset round-trip (request → read the token from the
  test mailer → set a password → land signed in), and account deletion.
- `accessibility.spec.ts` entries for each.

---

## Out of scope

- **Admin** (`/admin`, `/admin/stats`, `/admin/verify_mobile`, 84 lines) stays
  HAML, as the plan already allows: internal, low value. M11 keeps the minimal
  legacy layout it needs.
- **Three dead views**, to be deleted at M11 rather than ported:
  `devise/confirmations/new.html.erb` (`:confirmable` is not in the model's
  devise modules), `devise/shared/_links.html.erb` (rendered only by that dead
  view), and `users/new.html.haml` (posts to `/auth/identity/register`, a
  strategy that is not configured).
- **`/privacy`** needs nothing: it 301s to Forward Democracy's external policy
  and the React footer already links there directly.

## What remains after M10

Nothing left to port. M11 (cutover) is then gated on two open items, both
already tracked:

1. **The SEO question** — plan risk 6, still "to confirm with the team". A
   client-rendered `/` loses its server HTML. A decision, not a task.
2. **E2E flakiness** — [#1074](https://github.com/swapmyvote/swapmyvote/issues/1074).
   Worth closing before cutover, since the suite is the main evidence the flip
   worked, and a red run currently proves nothing.

Also worth a full regression pass at M11 regardless: master moved from Rails
6.1 to 8.1.3.1 underneath this work (#1069–#1071), so milestone-era test runs
are not evidence about the app as it now stands.
