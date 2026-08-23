# M4 — constituency and profile edit in React

Design for milestone **M4** of [`docs/frontend-modernization-plan.md`](../../frontend-modernization-plan.md).
Follows M3 (#1046, #1049), which landed the home page, the entry form and the
postcode/constituency lookup.

## Problem

Three legacy screens carry a user's swap profile, and none of them exists in React:

| Legacy route | View | What it does |
| --- | --- | --- |
| `GET/PATCH /user/constituency` | `app/views/user/constituencies/edit.html.haml` | Onboarding: constituency (+ email when blank). `users#show` redirects here when the user has no constituency or no email. |
| `GET /user/edit`, `PATCH /user` | `app/views/users/edit.html.haml` | Full profile: preferred party, willing party, constituency, postcode helper, email, mobile, delete-account link. |
| `GET /user/review` | `app/views/users/review.haml` | Shown after a save that changed the swap profile: constituency poll chart, an interpretation of the user's willing party's position, Proceed / Change. |

Both edit screens still depend on the jQuery `postcodesHelper` entrypoint, and
`users#edit` on `intlTelInput` as well.

## Decisions

| Question | Decision |
| --- | --- |
| Port both edit screens, or unify them? | **Both, at parity.** Keeps the `users#show` onboarding redirect meaningful and makes cutover a straight route swap rather than a flow change. |
| Mobile phone on the profile screen | **Status + link out.** The React screen shows verified / unverified from the session payload and links (full-page) to the legacy mobile page. M6 owns the real phone input and OTP; duplicating `intlTelInput` here would be thrown away. |
| Review screen | **In scope for M4.** It is the direct consequence of a profile save, so leaving it out would leave the flow untestable end to end. |
| Poll chart | **chart.js 4 + react-chartjs-2**, matching tacticalvote. Not Google Charts (external script, consent baggage, imperative global), not hand-rolled SVG (we expect more, and more sophisticated, charts — including TV's). |
| Chart structure | **Thin generic canvas wrapper + one config builder per chart.** Chart.js components and plugins are registered by the chart that needs them, so a future TV-style chart can pull in `chartjs-plugin-annotation` or the luxon adapter without every page paying for it. |
| Poll payload | **Raw numbers, not chart rows.** The API returns votes, marginal scores and party colours; turning those into datasets is the frontend's job, so a different chart can be built from the same endpoint. |
| Cutover | **None.** All three screens ship behind `/app/*`; `/user`, `/user/constituency` and `/user/review` keep serving HAML, per the single-cutover policy. |

## API

### `PATCH /api/v1/user` — `Api::V1::UsersController#update`

Permitted params mirror the legacy `UsersController#user_params`, minus the
mobile number (M6): `preferred_party_id`, `willing_party_id`,
`constituency_ons_id`, `email`, `consent_news_email`.

Guards, in order:

1. `require_logged_in!` → 401 `unauthenticated`
2. `require_swapping_open!` → 403 `phase_forbidden`
3. `reject_when_voting_info_locked!` → 403 `voting_info_locked`

Guards 2 and 3 are new on `Api::V1::BaseController` and mirror
`require_swapping_open` and `restricted_when_voting_open`
(`app/controllers/users_controller.rb:92`). The legacy versions redirect; these
return status codes.

Success (200):

```json
{ "user": { …UserSerializer… }, "reviewRequired": true }
```

`reviewRequired` is `User#swap_profile_changed?` — willing party or constituency
changed — captured after `assign_attributes` and before `save`, which is exactly
when the legacy controller reads it.

Failure (422, `validation_failed`) carries the legacy message strings verbatim so
copy does not drift between the two live sites:

- "You must state which party you would prefer to vote for."
- "You must state which party you are willing to vote for."
- "You must tell us your constituency. Without it, the swaps we offer may not make sense."
- plus `errors.full_messages` from the model (e.g. email format).

The constituency-only screen uses this same endpoint with a subset of fields;
requiring a constituency is enforced by the client's screen and by the server
message above, not by a second endpoint.

### `GET /api/v1/constituencies/:ons_id` — `Api::V1::ConstituenciesController#show`

Reference data, no auth and no phase gate, matching the existing `#index`. Poll
data is already public on legacy pages.

```json
{
  "onsId": "E14001063",
  "name": "…",
  "polls": [
    {
      "partyId": 3,
      "partyName": "Labour",
      "partyShortName": "Lab",
      "color": "#e4003b",
      "votes": 4210,
      "marginalScore": 850,
      "signedMarginalScore": -850
    }
  ]
}
```

`votes` is the raw stored value; the legacy helper divides by 100 for display
percentages (`app/helpers/polls_helper.rb`) and the frontend does the same. Polls
with zero votes are excluded, matching `poll_data_for`. Order is by votes
descending.

Serializer: `Api::V1::PollSerializer`, with `ConstituencySerializer` gaining an
optional `polls` association used by `#show` only, so `#index` stays cheap.

## Frontend

Routes added to the `SpaController` allow-list in `config/routes.rb`, the
react-router table in `app/frontend/app/App.tsx`, and `app/frontend/lib/spaPaths.ts`:

- `/app/profile` — full profile edit
- `/app/constituency` — constituency-only edit
- `/app/review` — post-save review

### Components

`app/frontend/components/profile/`

- **`ProfileForm.tsx`** — preferred/willing party selects, constituency select,
  the M3 `ConstituencyAutocomplete` and `PostcodeLookup`, email field, mobile
  status block, swap-change warning, delete-account link. The warning has two
  states, ported from the HAML: when `flags.votingInfoLocked`, party and
  constituency controls are disabled and the alert explains the lock; otherwise
  the alert warns that changes undo an agreed swap. Labels are left-aligned.
- **`ConstituencyForm.tsx`** — constituency select + postcode lookup, plus the
  email field only when the user's email is blank (legacy behaviour).
- **`ProfileReview.tsx`** — poll chart, interpretation, Proceed / Change. Renders
  the legacy "Whoops, you shouldn't be here" fallback when the user has no
  willing party or no constituency.

`app/frontend/components/polls/`

- **`PollChart.tsx`** — registers the Chart.js pieces it needs
  (`BarController`, `BarElement`, `CategoryScale`, `LinearScale`, `Tooltip`) and
  renders `react-chartjs-2`'s `<Chart type="bar">` with `aria-label`.
- **`pollChartConfig.ts`** — pure function from polls to `{ data, options }`,
  unit tested. Ports the legacy options: no legend, no vertical gridlines,
  hidden y-axis labels, per-bar party colour, percentage annotations,
  `groupWidth` 90%.

`app/frontend/lib/pollInterpretation.ts` — pure function porting the three
branches of `app/views/user/swaps/_polls_interpretation_self.html.haml`
(marginal score under 1000 → "could make a difference"; positive signed score →
"safe win"; otherwise → "trailing"), including the `%d%%` / `%.1g%%` formatting
switch at 9%. Returns structured text for the component to render.

Types for all new payloads go in `app/frontend/types/api.ts`.

### Navigation

- Profile save → `reviewRequired ? /app/review : /app/profile` with a success
  alert. Legacy sends the user to `/user`, which is M7's dashboard; sending them
  back to the form keeps M4 inside the SPA.
- Constituency save → full-page navigation to `/user/swap` (HAML), matching the
  legacy redirect, until M7 ports it.
- Review Proceed → full-page `/user` (HAML). Review Change → `/app/profile`.
- Mobile link and delete-account link are full-page anchors to their HAML pages.

Every cross-boundary link is a plain `<a>`, per the coexistence contract.

## Dependencies

Add `chart.js@^4.5` and `react-chartjs-2@^5.3` (same majors as tacticalvote).
No `chartjs-adapter-luxon` or `chartjs-plugin-annotation` yet — they arrive with
the first chart that needs them.

## Testing

- **RSpec** `spec/requests/api/v1/users_spec.rb`: successful update, `reviewRequired`
  true/false, 401 unauthenticated, 403 when swapping closed, 403 when voting info
  is locked, 422 for each missing-party case and a bad email, and CSRF rejection.
  `spec/requests/api/v1/constituencies_spec.rb` gains `#show`: payload shape,
  zero-vote polls excluded, ordering, 404 for an unknown ONS id.
- **Vitest**: `ProfileForm` (renders current values, locked state disables
  controls, validation errors render, submit posts the right body),
  `ConstituencyForm` (email field only when blank), `ProfileReview` (fallback
  state, interpretation text), `pollChartConfig`, `pollInterpretation`.
  `react-chartjs-2` is mocked in component tests — jsdom has no canvas.
- **Playwright + axe**: sign in through the legacy page, visit `/app/profile`,
  change the willing party, land on `/app/review`, and scan all three screens.

## Out of scope

- Cutting any canonical route over to React (M9).
- The phone input and OTP flow (M6); `intlTelInput.js` stays untouched.
- Account deletion, password reset, and the `/user` dashboard (M7).
- Replacing the legacy Google Charts usage on HAML pages — it stays until cutover.
