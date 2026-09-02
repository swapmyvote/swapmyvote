# M7 — core swap flow in React

Design for milestone **M7** of [`docs/frontend-modernization-plan.md`](../../frontend-modernization-plan.md).
Follows M6 (#1056), which landed mobile verification and removed the last link
from the SPA out to a HAML screen it had replaced.

## Problem

M7 is the heart of the product: finding a swap partner, offering a swap,
confirming or rejecting one, and the dashboard that shows which of those states
you are in. Everything before it was a way of getting here — an account, a
constituency, a verified phone — and none of it is worth anything to a user
until they can actually swap a vote in React.

It is also the first screen set whose state changes **out of band**. Every
milestone so far rendered state that only the current user could change. Here a
partner can confirm or reject while you are looking at the page, and
`Swap.cancel_old` expires unconfirmed swaps on a schedule. That is what the
plan's "react-query polling matters most here" line means.

### What is being ported

Two controllers and nine views.

| Legacy route | Controller action / view | What it does |
| --- | --- | --- |
| `GET /user/swap` | `User::SwapsController#show` → `user/swaps/show.html.haml` | The find-a-swap screen. Calls `User#potential_swap_users(5)`, which expires stale `PotentialSwap` rows, generates fresh matches and returns them ranked by the target's willing-party marginal score. Renders `_list_potential_swaps` or, when there are none, `_searching_for_swap`. Redirects to the dashboard when the user is already swapped. |
| `GET /user/swap/new?user_id=` | `#new` → `user/swaps/new.html.haml` | One candidate's profile, a consent checkbox, and a submit button. |
| `POST /user/swap` | `#create` | `User#swap_with_user_id(user_id, consent)`. Redirects to the dashboard on success; re-renders `new` with `flash[:errors]` on failure. |
| `PUT /user/swap` | `#update` | Two jobs behind one action: confirm an incoming swap, or record consent to share an email address. |
| `DELETE /user/swap` | `#destroy` | `User#clear_swap` — rejecting an incoming swap. |
| `GET /user` | `UsersController#show` → `users/show.html.haml` | The dashboard. Branches on `swap_confirmed?` / `outgoing_swap` / `incoming_swap` into `_swap_confirmed`, `_confirm_outgoing_swap`, `_confirm_incoming_swap`. Redirects to the constituency screen when constituency or email is missing, and to `/user/swap` when not swapped. |

Shared partials: `_swap_profile` (+ `_swap_profile_inner`), `_polls_interpretation`,
`_double_check_constituency`, `recommendations/_party_recommendation`,
`users/_info_summary`, `shared/_reach_out_to_swap`, `user/share/_social`.

### The gate stack

`User::SwapsController` carries eight `before_action` guards, and they are not
uniform across actions. Reproducing them exactly matters more than tidying them:

| Guard | Applies to |
| --- | --- |
| `require_swapping_open` | `show`, `new`, `create` — **not** `update` or `destroy` |
| `require_login` | all |
| `assert_incoming_swap_exists` | `destroy` |
| `assert_swap_exists` (incoming **or** outgoing) | `update` |
| `assert_parties_exist` | `show` |
| `assert_has_email`, `assert_has_constituency`, `assert_mobile_phone_present`, `assert_mobile_phone_verified` | `new`, `create`, `update` |

The asymmetry is deliberate in the original and is preserved here: someone who
has already swapped can still confirm, share an email or reject after swapping
closes, and only the **chosen** side can reject — the HAML outgoing view offers
no cancel control, and `destroy` refuses without an incoming swap.

### Two behaviours easy to lose in a port

- **Redaction.** Every pre-confirmation view calls `other_user.redacted_name`;
  `_swap_confirmed` is the only one that calls `name`. The real name is a
  reward for a confirmed swap, not a property of the record.
- **Consent gates the email address, not the swap.** `_confirm_outgoing_swap`
  and `_swap_confirmed` both nag an un-consented user with a checkbox that
  `PUT`s `consent_share_email`. Only when the *partner* has consented does
  `contact_methods` disclose their address.

There is also a quirk in `#update` worth naming, because it looks like a bug
and is not being fixed here: confirming with the consent box unticked does
**not** confirm the swap. `swap_consent_given?` returns false, adds an error,
and control falls through to `update_swap`, which does nothing. The user gets
the consent complaint and stays unconfirmed.

## Decisions

| Question | Decision |
| --- | --- |
| API shape | **Singular `resource :swap` plus a separate `potential_swaps` collection.** Mirrors the legacy route table (`namespace :user { resource :swap }`) and keeps the two very different read costs — a swap with one partner, versus five candidates each with polls and recommendations — on separately tunable cache keys. |
| Where the fat swap lives | **Not on the session payload.** `SessionSerializer`'s thin `SwapSerializer` is unchanged and still drives chrome and guards. Fattening it would make every route in the app pay for partner poll rows and recommendation joins on a 60-second poll. |
| Candidate list refetching | **`GET`, with auto-refetch off.** `potential_swap_users` mutates — it expires rows and generates matches — so `staleTime: Infinity`, `refetchOnWindowFocus: false`, explicit refetch only. This matches the HAML behaviour, where matches regenerate when you actually visit the page. |
| Tactical-voting recommendations | **Ported in M7**, not deferred. They are part of the swap card as it ships today. |
| Social share block | **Built now as `components/share/SocialShare`.** Both dashboard partials embed it, so M7 needs it regardless; M8's `/user/share` screen reuses it. |
| Preview paths | `/app/dashboard`, `/app/swap`, `/app/swap/new/:userId`. |
| Mobile-verification prompt | **A link to `/app/mobile`**, not a second embedded phone form. The HAML screens embed `mobile_phone/_form` inside `_searching_for_swap` and `_confirm_incoming_swap` because there was nowhere else to put it; M6 gave us somewhere. |
| Candidate lookup by id | **Scoped to the viewer's own current candidates.** Legacy `#new` does a bare `User.find(params[:user_id])` on any id in the database. Scoping is a deliberate tightening — see "Deliberate divergences". |

## API

Routes, inside the existing `namespace :api { namespace :v1 }`:

```ruby
resource  :swap,            only: [:show, :create, :update, :destroy], controller: "swaps"
resources :potential_swaps, only: [:index, :show], param: :user_id
```

### `Api::V1::SwapsController`

Guards map one-to-one onto the legacy `before_action` table above, returning
status codes where the original redirected. Legacy wording is preserved for
every message that a user sees today.

| Action | Guards | Failure |
| --- | --- | --- |
| all | `require_logged_in!` | 401 `unauthenticated` |
| `show`, `create` | `require_swapping_open!` | 403 `swapping_closed` |
| `create`, `update` | email, constituency, mobile present, mobile verified | 403 `email_missing` / `constituency_missing` / `mobile_missing` / `mobile_unverified` |
| `update` | incoming **or** outgoing swap exists | 409 `no_swap` |
| `destroy` | incoming swap exists | 409 `no_swap` |

`mobile_unverified` uses `User#mobile_verification_missing?`, not
`mobile_phone_verified?`, so `TEST_USERS_SKIP_MOBILE_VERIFICATION` keeps
working for the Playwright accounts exactly as it does for the HAML flow.

**Bodies.** `GET /api/v1/swap` answers `{ "swap": SwapDetail | null }`.
Mutations answer `{ "swap": SwapDetail | null, "session": SessionPayload }`, so
one round trip primes both caches — the dashboard needs the swap and the chrome
needs the session, and a swap mutation can change both. This extends, rather
than breaks, the convention `MobilePhoneVerificationsController#confirm` set of
answering a mutation with fresh session state.

`create` takes `{ user_id, consent_share_email }` and calls
`User#swap_with_user_id`. The three `can_swap_with?` failures (already swapped,
partner already swapped, partner has no email) become 409 `swap_conflict`;
missing consent becomes 422 `consent_required`.

`update` takes `{ confirmed?, consent_share_email? }` and reproduces the legacy
branch exactly: `confirmed == true` **and** consent given → `confirm_swap`;
anything else → `update_swap`. Confirming without consent therefore answers 422
`consent_required` and leaves the swap unconfirmed — the quirk described above,
preserved on purpose.

`destroy` calls `clear_swap`, whose `before_destroy` hook sends both
cancellation emails. Nothing new is needed for the mailers.

### `Api::V1::PotentialSwapsController`

`index` guards: logged in, `require_swapping_open!`, both parties set
(`assert_parties_exist` → 403 `profile_incomplete`), and 409 `already_swapped`
when the user already has a swap — the API backstop for the redirect legacy
`#show` performs. Body:

```json
{ "potentialSwaps": [SwapCandidate], "expiryMinutes": 120 }
```

`expiryMinutes` comes from `UsersHelper#potential_swap_expiry_mins`, which
`_list_potential_swaps` prints today.

`show` returns one candidate by user id, scoped to the viewer's current
`potential_swaps` rows, so a page refresh on `/app/swap/new/:userId` works
without re-running match generation.

## Serializers

- **`SwapCandidateSerializer`** — `name` (**`redacted_name`**), `imageUrl`,
  `constituencyName`, `constituencyOnsId`, `willingParty`, `preferredParty`,
  `badges { mobileVerified, provider, hasEmail }` (the four icons in
  `_swap_profile_inner`), `polls[]` (reuses the existing `PollSerializer`),
  `recommendations[]`.
- **`SwapRecommendationSerializer`** — ports `fullest_recommendations_for`:
  `{ siteId, siteName, siteLink, siteMetaDesc, match: "good" | "bad" | "unknown", text }`.
  `text` is null when `match` is `"unknown"`, matching the partial's branch.
- **`SwapDetailSerializer`** — `{ id, state, confirmed, consentGiven, partner }`.
  `consentGiven` is the viewer's own `consented_to_share_email?`, which is what
  the three consent forms branch on. `partner` is the candidate shape with two
  rules enforced **in the serializer, not the view**:
  - `name` is unredacted only when `swap.confirmed`;
  - `contact { email, profileUrl, provider, facebookLogin }` is serialized only
    when that partner's own `consented_to_share_email?` is true, and is null
    otherwise. This is what `ReachOutToSwap` renders, and it is the one place in
    the API where one user's email address can reach another.

`SessionSerializer` and its `SwapSerializer` are untouched.

Every shape is mirrored in `app/frontend/types/api.ts`, which stays the FE/BE
contract.

## SPA

`spaPaths` gains `dashboard: "/app/dashboard"`, `swap: "/app/swap"` and
`swapNew: "/app/swap/new/:userId"`, plus a `swapNewPath(userId)` helper for
building links. The Rails `SpaController` allow-list gains the three, including
the `:user_id` segment, and stays in lockstep with `App.tsx`.

### Pages

- **`pages/Dashboard.tsx`** — ports `users#show`. `RequireLogin` +
  `RequireSwappingOpen`; redirects to `/app/constituency` when constituency or
  email is missing, and to `/app/swap` when not swapped. Renders one of
  `SwapConfirmed` / `ConfirmOutgoingSwap` / `ConfirmIncomingSwap`, then
  `InfoSummary`.
- **`pages/Swap.tsx`** — ports `user/swaps#show`. Redirects to the dashboard
  when already swapped, then renders `PotentialSwapList` or `SearchingForSwap`,
  then `InfoSummary`.
- **`pages/SwapNew.tsx`** — ports `#new` and `#create`.

### Components (`components/swap/`)

`SwapProfileCard` (ports `_swap_profile` + `_swap_profile_inner`: avatar,
redacted name, badges, "will vote X if you vote Y", poll chart unless
`election.hidePolls`, interpretation, recommendations, optional "Offer to swap"
link), `PartnerPollInterpretation`, `PartyRecommendations`, `PotentialSwapList`,
`SearchingForSwap`, `ConfirmIncomingSwap` + `RejectSwapModal`,
`ConfirmOutgoingSwap`, `SwapConfirmed`, `ReachOutToSwap`, and
`ShareEmailConsentForm` — the three near-identical HAML consent forms
(`consent_share_email_chosen`, `consent_share_email_chooser`,
`consent_share_email`) collapse into one component posting one field.

Outside that folder: `components/share/SocialShare.tsx` (the
`shareOnFacebook` / `shareOnTwitter` Sprockets globals become plain
`window.open` URLs in TypeScript) and `components/profile/InfoSummary.tsx`.

`_double_check_constituency` is one line of MRP-predictions small print behind
`hide_polls?`; it does not earn a component and is inlined where its three
callers render it.

`PartnerPollInterpretation` reuses the existing `interpretPoll` from
`lib/pollInterpretation.ts` — `_polls_interpretation` and
`_polls_interpretation_self` share one calculation and differ only in copy, so
only the strings are new.

### Data flow

`lib/swap.ts`:

- `useSwap()` — `GET /swap`, `staleTime` 5s, `refetchInterval` 15s, refetch on
  focus. Mounted by the dashboard only; the 60s session poll continues to cover
  the rest of the app.
- `usePotentialSwaps()` — `staleTime: Infinity`, `refetchOnWindowFocus: false`.
- `offerSwap`, `confirmSwap`, `shareEmail`, `cancelSwap` — each primes
  `["swap"]` and `["session"]` from the mutation response and invalidates
  `["potentialSwaps"]`.

A 409 from any mutation means the swap changed underneath us: surface "this
swap changed" and invalidate both queries rather than retrying. This is risk 5
in the plan ("Out-of-band swap state").

## Deliberate divergences from the legacy behaviour

Three, all small, all worth stating so a reviewer does not read them as port
errors:

1. **Candidate lookup is scoped.** `GET /api/v1/potential_swaps/:user_id` only
   finds users in the viewer's current `potential_swaps`. Legacy `#new` accepts
   any user id. `#create` was already protected by `can_swap_with?`, so this
   closes a profile-disclosure hole, not a swap hole.
2. **Mobile verification is a link, not an embedded form.**
3. **Nothing is saved when a guard fails.** Same posture as
   `Api::V1::UsersController`, where the legacy screens persist a change and
   then flash a complaint about it.

## Testing

- **Vitest** — one spec per component, covering the branches that carry
  behaviour: badge rendering, `hidePolls`, redacted versus real name,
  recommendation match states, the empty-candidate path, the reject modal, the
  consent form's three call sites, `ReachOutToSwap` with and without contact
  methods. Plus the three pages' guard and redirect behaviour, and `lib/swap.ts`
  cache priming.
- **RSpec** — `spec/requests/api/v1/swaps_spec.rb` and
  `potential_swaps_spec.rb`: every guard code above, the `create`/`update`
  conflict and consent paths, serializer shapes asserted against
  `types/api.ts`, and both privacy rules (email absent without partner consent;
  name redacted until confirmed).
- **Playwright** — `playwright-tests/swap.spec.ts` drives the two-account
  end-to-end the plan's Verification section calls for: sign in → constituency →
  mobile → pick a candidate → offer → sign in as the partner → confirm → assert
  both dashboards → reject path. The three new screens join the signed-in block
  of `accessibility.spec.ts`.

## Out of scope

- **No canonical route flips.** `/user` and `/user/swap` keep serving HAML, as
  do all their partials and the `intlTelInput` entrypoint. `ProfileReview`'s
  `hamlDashboard = "/user"` constant becomes `spaPaths.dashboard` — that is the
  last SPA link out to a screen React now has.
- `user/vote#show/create` and `user/share#show` are M8.
- Nothing is deleted. M9 cleanup still owns every removal.
