# M5 — auth in React

Design for milestone **M5** of [`docs/frontend-modernization-plan.md`](../../frontend-modernization-plan.md).
Follows M4 (#1052), which landed the constituency, profile and review screens.

## Problem

Every React screen built so far either works logged out or links out of the SPA
to get a session. There is no way to log in, sign up or reach a logged-in state
without leaving React:

| Legacy route | Controller / view | What it does |
| --- | --- | --- |
| `GET /users/sign_in` | `Users::SessionsController` → `app/views/devise/sessions/new.html.erb` | Email + password form, links to password reset and sign-up. |
| `POST /users/sign_in` | `Users::SessionsController#create` | Doubles as the home page's "stash the entry form's parties, then redirect to sign-up" hack (see below). |
| `GET /users/sign_up` | `Users::RegistrationsController` → `app/views/devise/registrations/new.html.erb` | Email, name, password, password confirmation, two consent checkboxes, `invisible_captcha`. |
| `POST /users` | `Users::RegistrationsController#create` | Merges `session[:user_params]` into the new account. |
| `DELETE /users/sign_out` | Devise | Already ported: `DELETE /api/v1/session`, used by `Navigation`. |

Three React components currently leave the SPA to reach these:
`Navigation`'s log-in link, `RequireLogin`'s alert, and `EntryForm`'s
`window.location.assign("/users/sign_in")`.

### The plan's M5 line is stale in two ways

It promises a **login modal** and **social buttons**. Commit `8a4b078`
("Improve sign-up flow", June 2024) deleted both — the modal partial and the
Twitter/Facebook choice dialog — because "we only support email now". The live
site has been two full pages and email-only ever since.
`Users::OmniauthCallbacksController`, the `/auth/*` routes and `Identity` all
still exist so accounts created through social login keep working, but no UI
anywhere offers those providers.

### The pre-populate gap

The React entry form's answers never reach a new account. `EntryForm` stashes
them with `POST /api/v1/pre_populate`, which writes `session[:pre_populate]`
keyed on party **names**. `Users::RegistrationsController#create` reads
`session[:user_params]`, keyed on party **ids**, written only by the legacy
`Users::SessionsController#create`. The two never meet. M5 has to close this,
because sign-up is the point at which those answers become a user.

## Decisions

| Question | Decision |
| --- | --- |
| Social login | **Out of scope.** React matches the live site: email + password. OmniAuth routes, callbacks controller and `Identity` are left untouched, so existing social accounts are unaffected. The plan's M5 line is amended to say so. |
| Modal or pages? | **Two pages**, `/app/login` and `/app/signup`, matching the live site since `8a4b078`. |
| Where do the endpoints live? | **`/api/v1`**, not `respond_to :json` on the Devise controllers. One namespace, one error convention, one spec directory — and it keeps hands off `Users::SessionsController#create`, whose `create` is really two features in a trench coat. Devise's failure app would otherwise return its own 401 JSON shape, giving the SPA two error conventions. |
| Password reset | **Stays HAML.** The React login page links to `/users/password/new` as a full-page anchor, the same boundary treatment used elsewhere. Reset mail and Devise's edit form are untouched. |
| Post-auth destination | **Stays in the SPA.** `/user` is M7 and unported; sending users there would dead-end the preview flow and make it un-E2E-testable. |
| Cutover | **None.** Both screens ship behind `/app/*`; `/users/sign_in` and `/users/sign_up` keep serving Devise HAML, per the single-cutover policy. |

## API

Both endpoints answer with the **same `SessionPayload`** as
`GET /api/v1/session`, so the caller learns who it is now talking as without a
second round trip. `Login` and `SignUp` read the landing decision straight out
of it and then `await refetchSession()`, so every other consumer of the
react-query cache sees the new user too; `SessionContext#logOut` is the one
that primes the cache from the response instead of refetching. The payload
builder moves off `Api::V1::SessionController` into a shared
`Api::V1::SessionPayload` concern that all three controllers include.

All three session-changing endpoints also return the **rotated CSRF token** in
an `X-CSRF-Token` response header. Signing in deletes `session[:_csrf_token]`
(Devise's `csrf_cleaner` hook) and signing out throws the session away, so the
token the SPA read from `<meta name="csrf-token">` at boot is dead from that
point on and it has no other way to learn the replacement short of a full page
load. Returning it is safe: same-origin only, and it is not a secret from a
page that is already holding one.

### `POST /api/v1/session` — `Api::V1::SessionController#create`

Body — flat, not nested under `user`, matching how `Api::V1::UsersController`
and `Api::V1::PrePopulateController` already read their params:

```json
{ "email": "…", "password": "…" }
```

Guards, in order:

1. `require_logins_open!` → 403 `logins_closed`
2. `reject_when_logged_in!` → 403 `already_authenticated`, mirroring the
   `require_no_authentication` Devise prepends to its own
   `SessionsController` — an already-signed-in caller must not be able to swap
   accounts through this endpoint.

Implementation is explicit rather than `warden.authenticate`:

```ruby
return render_invalid_credentials if email.blank?

user = User.find_by("lower(email) = ?", email)
return render_invalid_credentials unless user&.valid_password?(password)

sign_in(user, event: :authentication)
remember_me(user)
```

A blank `email` is refused before the lookup: a non-scalar one is dropped by
`permit` and would otherwise reach `lower(email) = ''`, which matches the
blank-email row a social sign-up leaves behind.

`event: :authentication` is what makes Warden run Devise's
`after_authentication` hooks, `csrf_cleaner` among them. `warden.authenticate!`
does this on the legacy path; a plain `sign_in` would leave this endpoint
weaker than the one it replaces.

**Why not Warden.** Warden's `database_authenticatable` strategy reads
credentials through `Rack::Request#POST`, which parses form and multipart
bodies but not JSON. Rails parses a JSON body separately into
`action_dispatch.request.request_parameters`, so the strategy would see no
credentials and every login would fail. Only `:database_authenticatable` and
`:rememberable` are in play for this app — no `:lockable`, `:confirmable` or
`:timeoutable` — so `valid_password?` + `sign_in` is a faithful reimplementation
of what the strategy would have done, not a shortcut past it.

`remember_me` is unconditional **on login only**, matching the legacy
`params[:user].merge!(remember_me: 1)` the login form sent. Registration does
not remember: Devise's `sign_up` never did either.

Failure is **401 `invalid_credentials`** with a single generic message. It never
distinguishes "no such account" from "wrong password", so the endpoint is not an
account-existence oracle.

Success is 200 with the logged-in `SessionPayload`.

### `POST /api/v1/registration` — `Api::V1::RegistrationController#create`

Body:

```json
{ "name": "…", "email": "…", "password": "…",
  "password_confirmation": "…",
  "consent_news_email": false,
  "consent_to_data_processing": true,
  "swap_reference": "" }
```

Guards, in order:

1. `require_logins_open!` → 403 `logins_closed`
2. `reject_when_logged_in!` → 403 `already_authenticated` — without it a
   logged-in user could create a second account, be switched into it, orphan
   the first and consume their `pre_populate` stash
3. `reject_honeypot!` → 422 `spam_detected`

Permitted attributes mirror `Users::RegistrationsController#configure_sign_up_params`
minus the party and constituency ids, which now come from the session (below):
`name`, `email`, `password`, `password_confirmation`, `consent_news_email`,
`consent_to_data_processing`.

`consent_to_data_processing` is a virtual attribute (`validates … acceptance: true`),
not a column. `consent_news_email` is a real column.

`name` is always sent, `""` rather than omitted when blank, and the controller
defaults it to `""` besides. `User#check_name_is_not_email` calls
`name.include?("@")` unguarded, so a genuine `nil` raises `NoMethodError`
before `validates :name, presence: true` can report it — a 500 where a 422
belongs. An empty string validates normally.

`user.save!` → the existing `rescue_from ActiveRecord::RecordInvalid` → 422
`validation_failed` with `fields`, so per-field messages need no new code.
`User`'s `after_save :send_welcome_email` fires on its own.

Success is **201** with the logged-in `SessionPayload`.

### `require_logins_open!` on `BaseController`

New shared guard, mirroring `ApplicationController#require_logins_open` (which
redirects to root). Returns 403 `logins_closed`. It exists so
`closed-warm-up` — where the database is expected to be empty and the site is
not meant to look usable — refuses account creation server-side, not just in the
UI.

### Stripping markup from validation messages

`UserErrorsConcern#email_uniqueness_errors` builds its messages with `link_to`,
so `errors.full_messages` can contain `<a href="/users/sign_in">Log in
instead.</a>`. Rendered into JSON that reaches React as a literal tag string.

`BaseController#render_error` strips tags from every message and every `fields`
value. Sanitising there rather than in `render_record_invalid` covers every
error the API can emit, including `Api::V1::UsersController`, which renders its
own validation failures instead of raising. It is a no-op for every message
that exists today except this one, and it guarantees no markup escapes into
the API regardless of what a future validation does.

The stripped text reads "A user with this email address already exists. Log in
instead." The sign-up page always renders an "Already have an account? Log in"
link below the form, so the sentence lands next to a real link rather than
dangling.

### Honeypot

`invisible_captcha` is a view helper that renders a randomly-named field into
HAML, so it cannot cross to a JSON API. `Users::RegistrationsController` keeps
using the gem unchanged; the React form gets an equivalent.

`SignUpForm` renders a permanently hidden `swap_reference` input, and
`reject_honeypot!` answers 422 `spam_detected` when it arrives non-blank. It is
not a `User` attribute, so it is permitted separately from the ones that are.
The field name is deliberately meaningless: `nickname` is a standard HTML
autocomplete token, so a password manager would fill it in and hand a real user
a 422 they can neither see nor clear — which is why `invisible_captcha`
randomises its own field name.

This is deliberately the weaker half of what the gem does — the timestamp check
is already disabled on the legacy controller (`timestamp_enabled: false`,
because it broke on double-submits), so only the honeypot was doing work there
either.

## Reaching the entry form's answers

`Api::V1::RegistrationController` reads `session[:pre_populate]` server-side and
applies it to the new user:

- `constituency_ons_id` → `constituency_ons_id`, resolved through the existing
  `ApplicationController#default_ons_constituency`, which already handles the
  deep link's `constituency_name` alternative
- `preferred_party_name` → `preferred_party_id`
- `willing_party_name` → `willing_party_id`

then deletes the key. The client sends nothing extra, mirroring how the legacy
controller consumes `session[:user_params]`.

Party names are matched through `ApplicationHelper#canonical_name`, not by
equality, because **two writers fill that session key**:
`Api::V1::PrePopulateController` stores an exact `Party#name`, but the legacy
deep-link route `ApiController#pre_populate` (`/swap?willing_party_name=…`)
stores whatever a partner site sent. `HomeController#prepopulate_fields_from_session`
already matches this way; this is the same rule in a second place.

A name that resolves to no party is skipped rather than treated as an error. The
stash is a convenience, and a user who lost it can set the same fields on
`/app/profile`.

## Client

New files under `app/frontend/`:

| File | Responsibility |
| --- | --- |
| `lib/auth.ts` | `logIn()`, `signUp()`, `postAuthPath()` — the API calls and the landing rule, with no React in them. |
| `components/auth/LoginForm.tsx` | Email + password, submit, error rendering. |
| `components/auth/SignUpForm.tsx` | The six fields, the honeypot, per-field errors. |
| `components/auth/RequireLoginsOpen.tsx` | Renders a "logins are closed" notice instead of its children when `!loginsOpen`, mirroring `RequireLogin`'s shape. |
| `components/auth/RequireLoggedOut.tsx` | Redirects to `postAuthPath(session)` instead of its children when someone already logged in reaches either page. |
| `pages/Login.tsx`, `pages/SignUp.tsx` | Page chrome, `RequireLoginsOpen`, and the navigation on success. |

`spaPaths` gains `login: "/app/login"` and `signup: "/app/signup"`;
`config/routes.rb` and `App.tsx` gain the matching pair, kept in lockstep as
always.

`postAuthPath(session)` sends an account with no constituency to
`/app/constituency` — the screen M4 built for exactly this case — and everything
else to `/app/home`. M7 repoints it at the React dashboard.

Three components stop leaving the SPA and use react-router instead:
`Navigation`'s log-in link, `RequireLogin`'s alert link, and `EntryForm`'s
`window.location.assign("/users/sign_in")`. After M5 the entry form flows
straight into the React sign-up with its answers intact.

Forms follow house style: labels and fields left-aligned, one field per row,
checkboxes stacked with labels aligned to the control. Errors render as a
`role="alert"` `<Alert>` for the top-level messages plus per-field text from
`fields`.

## Testing

**Vitest** (`app/frontend/**/*.test.tsx`):

- `LoginForm` — success calls `onSuccess`; 401 renders the generic message; a
  failed submit re-enables the button; both links point where they should.
- `SignUpForm` — success; 422 renders per-field messages against the right
  fields; the honeypot input exists and is hidden from the accessibility tree.
- `RequireLoginsOpen` — children when open, notice when closed.
- `RequireLoggedOut` — children when logged out, redirect when logged in.
- `apiClient` — a rotated token in a response header is used on the next
  request, in preference to the boot-time meta tag.
- `postAuthPath` — both branches.

**RSpec** (`spec/requests/api/v1/`):

- `session_spec.rb` gains `POST` cases: success returns the logged-in payload
  and sets the session; wrong password, unknown email and a blank email all
  return the same 401 body; 403 when logins are closed; 403 when already
  logged in; CSRF rejection; and the token in the session actually rotates,
  with the response carrying one the next request can use.
- New `registration_spec.rb`: creates the user and signs them in; merges
  `pre_populate` written by `Api::V1::PrePopulateController` **and** by the
  legacy deep-link route; ignores party and constituency ids sent in the body;
  422 `spam_detected` on a filled honeypot; 422 with tag-free messages on a
  duplicate email; 422 rather than a 500 when `name` is omitted; 403 when
  logins are closed; 403 when already logged in; CSRF rejection and rotation.

**Playwright** (`playwright-tests/auth.spec.ts`): sign up through `/app/signup`,
land on `/app/constituency`, log out, log back in through `/app/login`. Plus
axe scans of both pages, added to the logged-out block of
`accessibility.spec.ts`.

## Out of scope

- Social login, in any form.
- Password reset and account deletion. Reset stays HAML for now; deletion
  belongs to the profile screen, not to sign-up. Changing an email is already
  handled by `PATCH /api/v1/user` from M4.
- Any canonical route flip. `/users/sign_in` and `/users/sign_up` keep serving
  Devise HAML until M9.
