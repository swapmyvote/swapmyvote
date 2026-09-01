# M6 — mobile verification in React

Design for milestone **M6** of [`docs/frontend-modernization-plan.md`](../../frontend-modernization-plan.md).
Follows M5 (#1053), which landed login and sign-up.

## Problem

Mobile verification is the last thing standing between a new React account and
the swap flow. `User::SwapsController` refuses `new`/`create`/`update` unless
`mobile_phone` is present and `mobile_verification_missing?` is false, so M7
cannot be reached from React until a React user can verify a number.

Today the journey is three legacy screens and a jQuery widget:

| Legacy route | Controller / view | What it does |
| --- | --- | --- |
| `GET /user/edit` | `UsersController#edit` → `app/views/users/edit.html.haml` + `mobile_phone/_form` | The only place a number can be entered. `intlTelInput.js` decorates the `input[type=tel]`, writes the full international number into a hidden `mobile_phone[full]` field, and sets a custom validity message unless the number is a valid `MOBILE` or `FIXED_LINE_OR_MOBILE`. |
| `GET /mobile_phone/verify_create` | `MobilePhoneController#verify_create` → `verify_create.html.haml` | Assigns `params[:mobile_phone][:full]` to the phone, asks MessageBird for an OTP, stores `verify_id`, renders the 6-digit code form. Doubles as the "re-send" link. |
| `GET|POST /mobile_phone/verify_token` | `MobilePhoneController#verify_token` → `verify_token.html.haml` | Hands the token to MessageBird; on success sets `verified` and clears `verify_id`. |

`app/views/admin/verify_mobile.html.haml` is a fourth, admin-only screen that
fakes verification so testers can share one real number. It is not part of this
milestone.

The React side has a placeholder standing in for all of it:
`ProfileForm` renders a read-only "My mobile number is verified / not verified"
line and links out to `/user/edit`, with a comment saying M6 replaces it.

### What the legacy code actually validates

Two checks, in two different places, and both have to survive the port:

- **Client (`intlTelInput.js`):** the number parses as valid *and* its type is
  `MOBILE` or `FIXED_LINE_OR_MOBILE`. Failing the first gives "This doesn't
  look like a phone number"; failing only the second gives "This doesn't look
  like a mobile phone number". These are HTML5 custom validity messages, so
  they block submission.
- **Server (`MobilePhone`):** `validates :number, uniqueness: true` only. There
  is no server-side format check at all — the controller trusts whatever the
  widget put in the hidden field.

### MessageBird failure reasons

`MobilePhoneController#verify_failure_reason` reads `MessageBird::ErrorException`
and turns error code `10` into one of three user-facing strings, appending
" Please use the code sent most recently." to each. Anything else is notified to
Airbrake and shown as a generic failure. That mapping is the only part of the
legacy controller with real user-visible behaviour, and it is what the plan's
M6 line means by "map `verify_failure_reason` messages to a JSON
`error.reason`".

## Decisions

| Question | Decision |
| --- | --- |
| Phone input widget | **`react-phone-number-input`** (v3.4.18), by the author of `libphonenumber-js`, which it wraps. It is a real React component with the country/flag dropdown `intl-tel-input` gave us, and its `/max` subpath exports `parsePhoneNumber().getType()` — so the legacy `MOBILE` / `FIXED_LINE_OR_MOBILE` check becomes a pure function with real unit tests instead of a mocked DOM widget. |
| Why not wrap `intl-tel-input`? | It is pinned at 16.0.7 and has no React component in any published version (checked the exports map of 29.2.3). Wrapping it means driving a DOM-mutating widget through a ref, loading `utils.js` asynchronously, and testing validation only through a mock. Upgrading it instead would force a rewrite of the entrypoint the live HAML pages still load. |
| Screen shape | **One page, `/app/mobile`, two steps** — enter number, then enter code. The legacy flow is split across three screens only because the number lives on the profile form; there is no reason to reproduce that. |
| Number editing on `/app/profile` | **Stays out.** The profile form keeps a status line, now linking to `/app/mobile` instead of `/user/edit`. One phone widget, one screen. |
| Error convention | The existing `{ error: { code, messages, fields } }`, with codes per failure reason. The plan's "`error.reason`" would have been a second convention for one endpoint. |
| Server-side number check | **Add a light E.164 format check.** The legacy server trusts the client completely; a JSON endpoint is trivially callable without the widget. The mobile-type check stays client-side, as today — it needs metadata we are not going to load server-side. |
| E2E strategy | **Fake OTP driver** behind an env flag, refused in production, so Playwright can drive the real controller path end to end. Without it the OTP journey is untestable outside RSpec, because dev and CI have no MessageBird key. |
| Cutover | **None.** `/app/mobile` is a preview path; `/user/edit`, `/mobile_phone/*` and the admin bypass page all keep serving HAML, per the single-cutover policy. |

## API

Two endpoints, one controller, `Api::V1::MobilePhoneVerificationsController`.
Routed to the paths the plan names:

```ruby
scope :mobile_phone do
  resources :verifications, only: [:create],
            controller: "mobile_phone_verifications" do
    post :confirm, on: :collection
  end
end
```

giving `POST /api/v1/mobile_phone/verifications` and
`POST /api/v1/mobile_phone/verifications/confirm`.

Guards on both: `require_logged_in!` and a new `require_swapping_open!`, which
mirrors `ApplicationController#require_swapping_open` — the legacy controller's
two `before_action`s exactly.

### `require_swapping_open!` on `BaseController`

```ruby
def require_swapping_open!
  return if swapping_open?

  render_error(
    code: "swapping_closed",
    status: :forbidden,
    messages: ["Swapping is closed at the moment"]
  )
end
```

The legacy version redirects to the home page; this reports the refusal, like
every other guard in `BaseController`. It is the first phase gate on a mutation
endpoint, and M7's swap endpoints will reuse it.

### `POST /api/v1/mobile_phone/verifications`

Body `{ "number": "+447700900123" }`. The number is **optional**: omitting it
re-sends to the number already on file, which is what the legacy "re-sending"
link does.

| Case | Response |
| --- | --- |
| Already verified, and no number given or the number is unchanged | 409 `already_verified` |
| No number given and none on file | 422 `number_missing`, "Please enter your mobile phone number before you swap" (legacy wording) |
| Number given but not E.164 (`/\A\+[1-9]\d{6,14}\z/`) | 422 `invalid_number` |
| Number already belongs to another account | 422 `validation_failed` from `MobilePhone`'s uniqueness validation |
| MessageBird refuses the send | 502 `sms_send_failed`, "Sorry, I couldn't send you a verification SMS! Please try again later." (legacy wording), Airbrake notified, **phone row destroyed** |
| Sent | 200 `{ "number": "+447700900123", "sent": true }` |

**A verified user submitting a *different* number is not refused.** That is how
a number gets changed today — the profile form assigns through
`User#mobile_number=`, which drops the verified row and creates a fresh
unverified one — and since `/app/profile` no longer carries a number field,
`/app/mobile` is the only place left that can do it. Only a pointless
re-verification of the number already on file is refused.

Failure clean-up differs from the legacy controller in one place, deliberately.
`MobilePhoneController#rescue_error` calls `phone&.update(number: nil)`, but
`MobilePhone` validates `number` for uniqueness *including* nil, so the second
account to take that path fails the validation and the update silently returns
false, leaving the bad number in place. Destroying the row instead achieves
what the legacy code was reaching for — no unsendable number sitting on the
account looking verifiable — without depending on a validation that does not
hold. The duplicate-number case needs no clean-up at all: `mobile_number=`
wraps its destroy-and-create in a transaction, so a uniqueness failure rolls
back and the account keeps whatever it had.

A previous `verify_id` is deleted through `SwapMyVote::MessageBird.verify_delete`
before the new one is stored, as `delete_previous_verify_id` does, and with the
same tolerance for MessageBird's "Verify object could not be found" (code 20).

Setting the number uses `current_user.mobile_number=`, which destroys and
recreates the `MobilePhone` row inside a transaction. That is deliberate: a new
number is a new verification, so dropping the old row's `verified` and
`verify_id` is correct. When no number is sent, the existing row is left alone.

### `POST /api/v1/mobile_phone/verifications/confirm`

Body `{ "token": "123456" }`.

| Case | Response |
| --- | --- |
| Already verified | 409 `already_verified` |
| No `verify_id` on file | 409 `no_verification_pending` |
| MessageBird code 10, "token has already been processed" | 422 `code_already_used` |
| MessageBird code 10, "expired" | 422 `code_expired` |
| MessageBird code 10, "token is invalid" | 422 `code_incorrect` |
| Any other MessageBird error | 502 `verification_failed`, Airbrake notified |
| Confirmed | 200, **the session payload** |

The three code-10 messages keep the legacy strings and the legacy
" Please use the code sent most recently." suffix.

Answering with the session payload rather than 204 is the same move
`SessionController` makes: `mobileVerified` and `mobileSetButNotVerified` both
flip on success, and returning them saves the SPA a round trip before it can
show the verified state. It does **not** go through `render_session_payload` —
that method also returns a fresh CSRF token, which is only correct for
endpoints that change who we are logged in as. This one uses `session_payload`
from the same concern and renders it directly.

## Fake OTP driver

`SwapMyVote::MessageBird` gains a fake branch, active only when
`ENV["MESSAGEBIRD_FAKE_OTP"]` is set and `Rails.env.production?` is false — a
production deploy with the variable set raises at boot rather than silently
accepting a fixed code.

- `verify_create` returns a stub object exposing `id`, without calling the API.
- `verify_delete` is a no-op.
- `verify_token` compares against the flag's value and, on mismatch, raises a
  real `MessageBird::ErrorException` carrying code 10 / "token is invalid".

Raising the genuine exception matters: it means the E2E run exercises the same
`rescue` and the same reason-mapping as production, rather than a parallel
happy path. `Procfile.dev` and `playwright.config.ts` set
`MESSAGEBIRD_FAKE_OTP=123456` for the dev and E2E stacks. RSpec keeps stubbing
`SwapMyVote::MessageBird` directly and does not use the flag.

## Client

New route `spaPaths.mobile = "/app/mobile"`, added to `App.tsx` and to the
Rails `SpaController` allow-list in lockstep.

| File | Responsibility |
| --- | --- |
| `lib/phone.ts` | `phoneNumberProblem(value): string \| null`. Uses `parsePhoneNumber` from `react-phone-number-input/max`; returns the legacy "This doesn't look like a phone number" when the number does not parse or is invalid, "This doesn't look like a mobile phone number" when it is valid but its type is neither `MOBILE` nor `FIXED_LINE_OR_MOBILE`, and `null` when it is fine. Pure — the whole of the ported validation, unit-testable without React. |
| `lib/mobilePhone.ts` | `sendVerification({ number })` and `confirmVerification({ token })` over `apiClient`, typed against `types/api.ts`. |
| `components/mobile/PhoneNumberField.tsx` | `react-phone-number-input` with `defaultCountry="GB"`, Bootstrap styling, left-aligned label, and the `phoneNumberProblem` message rendered inline. |
| `components/mobile/VerificationCodeField.tsx` | Six digits: `inputMode="numeric"`, `pattern="[0-9]{6}"`, `maxLength={6}`. |
| `components/mobile/MobileVerification.tsx` | The `"number" \| "code"` state machine: send, show the code step with the number that was sent to, confirm, re-send. Owns error display, mapping `ApiError.code` to the right message and putting a failed confirm back in the code step rather than restarting. |
| `components/auth/RequireSwappingOpen.tsx` | The client mirror of `require_swapping_open!`, alongside the existing `RequireLogin` / `RequireLoginsOpen`. M6 is the first screen to need it; M7's swap screens reuse it. |
| `pages/Mobile.tsx` | `RequireLogin` + `RequireSwappingOpen` wrappers, the success state, and the already-verified card — which offers the form again, since changing a number is a re-verification. |

`ProfileForm.tsx` drops its `hamlMobile = "/user/edit"` anchor for a
react-router `<Link>` to `spaPaths.mobile`, and the comment explaining the
placeholder goes with it.

`types/api.ts` gains `MobileVerificationSent` for the send endpoint; confirming
answers with the `SessionPayload` that is already modelled.

`UserSerializer` gains a `mobileNumber` attribute, and `CurrentUser` gains the
matching `mobileNumber: string | null`. Without it the verification form would
start empty for a user who already has a number on file, and the profile
screen could say only whether a number is verified, not which one — the legacy
profile form shows the number itself. It is the user's own data, in a payload
that already carries their email, and it is serialized only for them.

Copy follows the house rules already in the SPA: labels and fields
left-aligned, and one-sentence UI strings carry no trailing full stop. The
legacy strings quoted back to the user from the server are the exception —
those are reproduced verbatim so the two live sites say the same thing.

### Where the user goes next

The legacy `verify_token` success card links to `user_path`, the dashboard,
which is M7 and unported. `/app/mobile` therefore ends on a success card
linking to `/app/profile`, the same treatment M5 gave its post-auth
destination. It moves to the dashboard when M7 lands.

## Testing

- **RSpec** — `spec/requests/api/v1/mobile_phone_verifications_spec.rb`: 401
  logged out; 403 when swapping is closed; 422 for missing, malformed and
  duplicate numbers, asserting a duplicate leaves the existing row intact; 409
  for a pointless re-verification and for confirm-with-no-pending-verification;
  a verified user changing to a different number being accepted; 502 on send
  failure, asserting the row is destroyed; a successful send storing
  `verify_id`; a successful confirm setting
  `verified`, clearing `verify_id` and returning the session payload; one
  example per MessageBird failure reason; and CSRF rejection.
- **Vitest** — `lib/phone.test.ts` running the real `libphonenumber-js` checks
  (a UK mobile passes, a UK landline is rejected as not-mobile, and garbage is
  rejected as not-a-number); `MobileVerification.test.tsx` for both steps,
  re-send, and the error-per-code rendering; `PhoneNumberField.test.tsx`;
  and the updated `ProfileForm.test.tsx` link assertion.
- **Playwright** — `playwright-tests/mobile.spec.ts` drives the seeded profile
  user through number → fake code → verified against the real stack, and
  `/app/mobile` joins the signed-in block of `accessibility.spec.ts`.

## Out of scope

- `app/frontend/entrypoints/intlTelInput.js`, `app/views/mobile_phone/*`,
  `app/views/users/edit.html.haml` and `app/views/admin/verify_mobile.html.haml`
  are untouched and stay live. Removal is M9 cleanup, after cutover.
- No canonical route flips. `/mobile_phone/verify_create` and
  `/mobile_phone/verify_token` keep serving HAML.
- `TEST_USERS_SKIP_MOBILE_VERIFICATION` and `User#mobile_verification_missing?`
  are unchanged. They gate the *swap* flow, so surfacing them in the session
  payload belongs to M7, where something reads them.
- A dedicated "change my number" screen. Submitting a different number on
  `/app/mobile` re-verifies, which covers the case, but the already-verified
  card is a link back to the form rather than a designed edit flow.
