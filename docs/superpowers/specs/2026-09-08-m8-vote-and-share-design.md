# M8 — vote and share in React

Ports the last two user-facing screens before cutover: `User::VoteController`
("I've voted") and `User::ShareController`. It also replaces the SPA's social
sharing with the pattern tacticalvote (TV) prototyped but never landed.

As with every milestone, the legacy HAML site is untouched and stays live.
`/user/vote` and `/user/share` keep serving HAML; React previews under
`/app/vote` and `/app/share` until the single cutover at M9.

## Problem

Two screens remain unported.

**`/user/vote`** is real and reachable. `GoVote.tsx` already links to it as a
full-page anchor marked "Still HAML" — the last link in the SPA pointing at a
screen React has not replaced. It has two states: a button that records the
vote and emails the swap partner, and a thank-you state.

**`/user/share`** is orphaned. Nothing in the codebase references
`user_share_path` — no view, helper, or controller. Its only substantive
content, the `_social` partial, was already ported as `SocialShare.tsx` during
M3/M7 and is embedded in `SearchingForSwap` and `ConfirmOutgoingSwap`. What
remains unique to the screen is a "we're looking for someone" line and a
"No Thanks, Skip »" link.

It is ported anyway. Cutover stays a pure like-for-like flip with no behaviour
decisions smuggled into it; whether to delete a screen that has been dark is an
M9 cleanup question, decided on its own merits.

### Sharing is the substantial part

`SocialShare.tsx` is a faithful port of swapmyvote's legacy `_social` partial —
Facebook popup, X (Twitter) popup, mailto. It is **not** how TV shares.

TV's `ShareBox` surfaces a dedicated WhatsApp button, a Bluesky intent link,
and a generic `ShareButton`; X appears nowhere as a share target, only as a
footer follow link. The React site adopts TV's shape and **drops X entirely**.
The legacy HAML site keeps its existing buttons unchanged.

### What TV concluded about the share library

TV's own decision was deferred, not settled, and this milestone resolves it.

- [Issue #66](https://github.com/forwarddemocracy/tacticalvote/issues/66)
  raised that `react-web-share` is unmaintained (three years,
  [hc-oss/react-web-share#101](https://github.com/hc-oss/react-web-share/issues/101))
  and cannot share to Bluesky.
- [PR #536](https://github.com/forwarddemocracy/tacticalvote/pull/536) (merged
  2026-05-04) backed the rewrite out at the user's request. `react-web-share`
  stayed as the desktop fallback and only a hand-rolled Bluesky button was
  layered on. Replacing it was "tracked separately".
- TV's `proto-react-share-fallback` branch (`dc1f1d51`) prototypes the
  successor: `react-share` plus runtime `navigator.share` detection. Unmerged.

swapmyvote lands that prototype's pattern, minus X. `react-share` is maintained
and has first-class `BlueskyShareButton`/`BlueskyIcon`, so it fixes what #66
actually hit, and it needs no React 19 peer override.

The prototype's blocking defect does not exist here. Its review notes a ~50ms
hydration flicker: Next server-renders the fallback row, then swaps to the
single button once `navigator.share` is detected on the client. The swapmyvote
SPA is entirely client-rendered, so detection happens before first paint and
there is nothing to flicker.

## Decisions

1. **`/user/share` is ported verbatim**, orphaned or not. Deleting it is an M9
   question.
2. **The vote screen requires a *confirmed* swap.** See divergences below.
3. **`POST /api/v1/vote` is idempotent** — a repeat sends no second email.
4. **The React site drops X.** Legacy HAML keeps its X button.
5. **Sharing follows TV's shape** — WhatsApp + Bluesky + generic share button —
   implemented with `react-share` + `navigator.share`, not `react-web-share`.
6. **Email stays in the fallback row.** `react-share`'s `EmailShareButton`
   takes `subject`/`body`, so the existing constituency-and-date recruitment
   message survives at no cost. It is not a dedicated button.
7. **Both WhatsApp affordances stay** — the dedicated button and the row's
   icon. The row only renders when `navigator.share` is absent, which is mostly
   desktop, where a WhatsApp Web link is still useful. TV left this open.
8. **A TV issue is raised** proposing the same upgrade, referencing this work.

## API

### `Api::V1::VoteController`

`resource :vote, only: [:create], controller: "vote"` inside the `api/v1`
namespace. There is deliberately **no `GET`** — every input the screen needs
already exists or belongs on the session payload:

| Needed | Source |
| --- | --- |
| `hasVoted` | new attribute on `UserSerializer` (session payload, already polled) |
| willing party name | `UserSerializer#willingParty` (exists) |
| partner's real name | `GET /api/v1/swap` → `SwapDetailSerializer` (exists) |

`SwapDetailSerializer` only discloses a partner's real name once the swap is
confirmed, which is exactly the guard this screen runs under — so the vote
screen needs no second, ungated name path.

**Guards on `#create`:** `require_logged_in!`, then a new
`require_confirmed_swap!` on `BaseController`, answering **409
`swap_not_confirmed`**.

**No phase gate.** Legacy `User::VoteController` has only `require_login` and
`require_swap`; this adds no gate the legacy screen does not have. In
particular it is *not* gated on `voting_open?` — the legacy screen is reachable
whenever a confirmed swap exists.

**Body:**

```ruby
# Idempotent: sends nothing, answers with current state.
return render_session_payload if current_user.has_voted

current_user.update!(has_voted: true)
UserMailer.partner_has_voted(current_user.swapped_with).deliver_now
render_session_payload
```

`render_session_payload` is the existing helper from the `SessionPayload`
concern that `SessionController` and `RegistrationController` both use, so this
endpoint answers in the shape the SPA already primes its session cache from and
the newly true `hasVoted` reaches the chrome in one round trip.

### `UserSerializer`

Gains one attribute:

```ruby
attribute :has_voted do |user|
  user.has_voted || false
end
```

`users.has_voted` is a boolean column with `default: false` but no `null:
false`, so it is coerced the same way `SwapSerializer#confirmed` is.

## SPA

### `lib/share.ts`

Pure functions, unit-tested, taking the `Election` the SPA already fetches:

- `shareText(election)` — swapmyvote's own tagline, ported from
  `ApplicationHelper#app_taglines`. The channels change; the copy does not.
- `buildBlueskyHref(election)` — `bsky.app/intent/compose`, mirroring TV's
  `utils/share.ts`.
- `buildWhatsAppHref(election)` — `api.whatsapp.com/send`.
- `emailBody(election)` — the existing recruitment message naming
  `eventChoice`, `dateDm` and `constituencyOther`. Moved here from
  `SocialShare.tsx` so the fallback row can use it.

All of them target `https://swapmyvote.uk`, not the current origin: a share
from a preview or staging host must still send people to the live site. This
matches the existing `siteUrl` constant.

### `components/share/ShareButton.tsx`

Renders one of two trees, chosen by a `navigator.share` capability check:

- **supported** — a single branded button firing the OS share sheet, with a
  clipboard copy-link fallback for the `AbortError` edge case.
- **unsupported** — a `react-share` row: WhatsApp, Bluesky, Facebook, LinkedIn,
  Reddit, Telegram, Email. **No X.**

The check runs during module init / first render, not in an effect, because
there is no server-rendered pass to reconcile with.

### `components/share/SocialShare.tsx` (rewritten)

Takes TV's `ShareBox` shape: a dedicated WhatsApp button, a dedicated Bluesky
button, then `<ShareButton />`. Its existing call sites — `SearchingForSwap`
and `ConfirmOutgoingSwap` — keep their current import unchanged, and both
already mock it in their tests, so they are insulated from the rewrite.

The Facebook popup, the X popup and the standalone mailto button are removed
from the React site.

### Pages

**`pages/Vote.tsx`** → `/app/vote`. Wrapped in `RequireLogin`. Redirects to
`/app/dashboard` when `useSwap()` reports no confirmed swap — the client mirror
of `require_confirmed_swap!`, guarded on `isPending` so a user with a good swap
is not bounced while the poll is still loading (the same care `Dashboard.tsx`
takes). Two states, ported from `vote/show.html.haml`:

- *not voted* — the prompt, a "Yes, I've voted! (for `<willingParty>`)" button,
  and the subdued note naming the partner and party.
- *voted* — the thank-you paragraph, then `<SocialShare />` in place of the
  legacy bespoke X button.

**`pages/Share.tsx`** → `/app/share`. Wrapped in `RequireLogin` and
`RequireSwappingOpen`, matching `User::ShareController`'s two `before_action`s.
The search line, `<SocialShare />`, and a "No Thanks, Skip »" link to
`/app/dashboard`.

### Wiring

- `spaPaths.vote` and `spaPaths.share` in `lib/spaPaths.ts`.
- `get "app/vote"` and `get "app/share"` in the `config/routes.rb` allow-list,
  kept in lockstep with the `App.tsx` route table.
- `GoVote.tsx` swaps its `/user/vote` full-page anchor for
  `<Link to={spaPaths.vote}>`, removing the last "Still HAML" link in the SPA.

## Deliberate divergences from the legacy behaviour

**The vote screen requires a confirmed swap.** `User::VoteController`'s
`require_swap` guard tests `@user.swapped?`, true for *any* swap, and the view
then prints `@user.swapped_with.name` — the partner's real name, unconfirmed
swap or not. That contradicts the disclosure rule M7 put in
`SwapPartnerDetailSerializer`, which withholds a real name until confirmation.

The loose guard is unreachable in practice: `_go_vote` only links to the screen
when `swap_confirmed?`. So the API guards on confirmation and answers 409
otherwise. This keeps M7's rule intact and needs no ungated name path.

**A repeat `POST` sends no second email.** Legacy `#create` sets `has_voted`
and calls `UserMailer.partner_has_voted` unconditionally, every time. In HAML
the button disappears once voted, so a double send is hard to trigger; a JSON
endpoint is easier to hit twice via a double-click or a retry. The legacy
screen never intended a second send — it just had nothing guarding it.

**X is gone from the React site.** Not a port of anything; a deliberate product
change, scoped to React. The HAML site keeps its X buttons until M9 deletes it
wholesale.

## Testing

**RSpec** — `spec/requests/api/v1/vote_spec.rb`: 401 unauthenticated; 409
`swap_not_confirmed` with no swap and with an unconfirmed swap; a first POST
sets `has_voted` and enqueues exactly one `partner_has_voted`; a repeat POST
returns 200 and sends none; the response matches the session payload shape;
a forged CSRF token is rejected. Plus `UserSerializer`'s new `hasVoted`.

**Vitest** — `Vote.test.tsx` (both states, the confirmed-swap redirect, the
POST); `Share.test.tsx`; `ShareButton.test.tsx` covering both branches by
stubbing `navigator.share` present and absent, and the clipboard fallback;
`SocialShare.test.tsx` updated for the new button set, asserting no X target;
`lib/share.test.ts` for the four URL/text builders.

**Playwright** — `playwright-tests/vote.spec.ts` drives a confirmed swap
through to the voted state. `/app/vote` and `/app/share` join the signed-in
block of `accessibility.spec.ts`.

**Unchanged and still green** — `spec/views/user/vote/show.html.haml_spec.rb`
and every other legacy spec. Nothing in `app/views/user/` is touched.

## Follow-up in tacticalvote

Raise an issue on `forwarddemocracy/tacticalvote` proposing the same upgrade:
replace `react-web-share` with `react-share` + `navigator.share`, resolving the
deferral in PR #536 and the root cause in issue #66. It should reference the
`proto-react-share-fallback` branch as prior art and this milestone as a landed
reference implementation, and note that TV additionally has to decide the X
question and handle the SSR hydration pass that swapmyvote does not have.

## Out of scope

- Deleting `/user/share`, `/user/vote`, or any other HAML — M9 cleanup.
- Cutting any canonical route over to React — M9, in one step.
- QR-code sharing (TV's `QrCodeShare`) — not something swapmyvote surfaces.
- Changing the legacy HAML site's share buttons.
- The SEO question that gates cutover, which remains open ahead of M9.
