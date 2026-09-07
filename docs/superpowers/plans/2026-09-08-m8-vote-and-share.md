# M8 — Vote and Share Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port `User::VoteController` and `User::ShareController` to React behind `/app/vote` and `/app/share`, and replace the SPA's social sharing with `react-share` + `navigator.share`, dropping X from the React site.

**Architecture:** One new write-only JSON endpoint (`POST /api/v1/vote`) answering with the existing session payload, plus one new attribute (`hasVoted`) on `UserSerializer`. Everything else the vote screen needs already exists on the session payload and `GET /api/v1/swap`. On the client, a new `lib/share.ts` holds the pure URL/text builders, a new `ShareButton` picks between `navigator.share` and a `react-share` fallback row, and `SocialShare` is rewritten around them — its two existing call sites keep their import unchanged.

**Tech Stack:** Rails 6.1 + Alba serializers + RSpec request specs; React 19 + TypeScript + react-bootstrap + `react-share`; Vitest + React Testing Library; Playwright + axe.

**Spec:** [`docs/superpowers/specs/2026-09-08-m8-vote-and-share-design.md`](../specs/2026-09-08-m8-vote-and-share-design.md)

**Ground rules from `AGENTS.md`:** always use braces in `if`/`else` bodies even for a single statement; prefer Bootstrap utility classes over custom CSS; no inline `style={{…}}` for static values; every new component and endpoint gets tests. Run commands with `PATH="$HOME/.rbenv/shims:$PATH"` so the pinned Ruby 3.3.12 wins.

**Nothing in `app/views/`, `app/controllers/user/` or `app/assets/` is touched by this plan.** The legacy HAML site stays live and unchanged.

---

## File Structure

**Backend — create:**
- `app/controllers/api/v1/vote_controller.rb` — the single `#create` action.
- `spec/requests/api/v1/vote_spec.rb` — its request spec.

**Backend — modify:**
- `app/controllers/api/v1/base_controller.rb` — add `require_confirmed_swap!`.
- `app/serializers/api/v1/user_serializer.rb` — add `has_voted`.
- `config/routes.rb` — add the `vote` resource and two SPA allow-list paths.
- `spec/requests/api/v1/session_spec.rb` — assert the new `hasVoted` key.

**Frontend — create:**
- `app/frontend/lib/share.ts` + `share.test.ts` — pure URL/text builders.
- `app/frontend/lib/vote.ts` + `vote.test.tsx` — the `recordVote` mutation.
- `app/frontend/components/share/ShareButton.tsx` + `.test.tsx` — native share vs fallback row.
- `app/frontend/pages/Vote.tsx` + `Vote.test.tsx`.
- `app/frontend/pages/Share.tsx` + `Share.test.tsx`.
- `playwright-tests/vote.spec.ts`.

**Frontend — modify:**
- `app/frontend/components/share/SocialShare.tsx` + `.test.tsx` — rewritten around `ShareButton`.
- `app/frontend/lib/spaPaths.ts` — `vote` and `share` entries.
- `app/frontend/app/App.tsx` — two routes.
- `app/frontend/types/api.ts` — `hasVoted` on `CurrentUser`.
- `app/frontend/components/home/GoVote.tsx` — anchor becomes a `<Link>`.
- `app/frontend/styles/globals.scss` — WhatsApp/Bluesky button colours.
- `playwright-tests/accessibility.spec.ts` — `/app/share` in the signed-in block, `/app/vote` as its own confirmed-swap scan.
- `playwright-tests/support/seedProfileUser.ts` — add `seedConfirmedSwapPair`.
- `package.json` — add `react-share`.

Backend first (tasks 1–4), because the frontend reads `hasVoted` off the session payload. Sharing (tasks 5–8) is independent of the vote endpoint and could run in parallel with tasks 1–4 if you are splitting work.

---

## Task 1: `hasVoted` on the session payload

**Files:**
- Modify: `app/serializers/api/v1/user_serializer.rb`
- Modify: `app/frontend/types/api.ts:35-48`
- Test: `spec/requests/api/v1/session_spec.rb`

- [ ] **Step 1: Write the failing test**

Find the example in `spec/requests/api/v1/session_spec.rb` that asserts the `currentUser` shape for a logged-in user (search for `"currentUser"`). Add a new example beside it:

```ruby
it "reports whether the user has recorded their vote" do
  user = create(:user)
  sign_in user

  get "/api/v1/session"

  expect(json["currentUser"]["hasVoted"]).to eq(false)
end

it "reports a user who has voted" do
  user = create(:user, has_voted: true)
  sign_in user

  get "/api/v1/session"

  expect(json["currentUser"]["hasVoted"]).to eq(true)
end
```

If the surrounding spec does not use a `json` helper or `sign_in`, copy whatever idiom the neighbouring examples in that file already use — do not introduce a new one.

- [ ] **Step 2: Run the tests to verify they fail**

```bash
PATH="$HOME/.rbenv/shims:$PATH" bundle exec rspec spec/requests/api/v1/session_spec.rb
```

Expected: FAIL — `hasVoted` is `nil`, not `false`.

- [ ] **Step 3: Add the attribute**

In `app/serializers/api/v1/user_serializer.rb`, after the `mobile_number` attribute block and before the two `one` associations:

```ruby
      # `users.has_voted` is `default: false` but nullable, so coerce for the
      # same reason SwapSerializer#confirmed does — the SPA's boolean contract
      # must not see nil.
      attribute :has_voted do |user|
        user.has_voted || false
      end
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
PATH="$HOME/.rbenv/shims:$PATH" bundle exec rspec spec/requests/api/v1/session_spec.rb
```

Expected: PASS.

- [ ] **Step 5: Mirror it in the TypeScript contract**

In `app/frontend/types/api.ts`, add to `interface CurrentUser` after `mobileSetButNotVerified`:

```typescript
  /** Whether they have told us they voted — `POST /api/v1/vote`. */
  hasVoted: boolean;
```

- [ ] **Step 6: Typecheck**

```bash
corepack yarn typecheck
```

Expected: clean. (Adding a required field to `CurrentUser` may break test fixtures that build a `CurrentUser` literal — if `tsc` reports any, add `hasVoted: false` to them.)

- [ ] **Step 7: Commit**

```bash
git add app/serializers/api/v1/user_serializer.rb app/frontend/types/api.ts spec/requests/api/v1/session_spec.rb
git commit -m "Add hasVoted to the session payload"
```

---

## Task 2: `require_confirmed_swap!` guard

**Files:**
- Modify: `app/controllers/api/v1/base_controller.rb`

This guard has no test of its own — task 3's request spec exercises it. It is a separate task only because it belongs in a different file with different reviewers.

- [ ] **Step 1: Add the guard**

In `app/controllers/api/v1/base_controller.rb`, immediately after `require_incoming_swap!` (which ends with the `no_swap` conflict), add:

```ruby
      # The vote screen's gate. Legacy User::VoteController#require_swap tests
      # `swapped?`, true for any swap, and its view then prints the partner's
      # real name — which contradicts the rule SwapPartnerDetailSerializer
      # enforces, that a real name is disclosed only once a swap is confirmed.
      # The loose guard is unreachable in practice: shared/_go_vote only links
      # to the screen when `swap_confirmed?`. So confirm-or-refuse here, and
      # the vote screen needs no second, ungated name path.
      def require_confirmed_swap!
        return if current_user.swap_confirmed?

        render_error(
          code: "swap_not_confirmed",
          status: :conflict,
          messages: ["You don't have a confirmed swap!"]
        )
      end
```

- [ ] **Step 2: Verify nothing regressed**

```bash
PATH="$HOME/.rbenv/shims:$PATH" bundle exec rspec spec/requests
```

Expected: PASS — the method is not called yet, so this only proves the file still loads.

- [ ] **Step 3: Rubocop**

```bash
PATH="$HOME/.rbenv/shims:$PATH" bundle exec rubocop app/controllers/api/v1/base_controller.rb
```

Expected: no offenses. If `Metrics/ClassLength` now trips, add the method to the existing exclusion rather than restructuring the class — that is a pre-existing shape, not this milestone's business.

- [ ] **Step 4: Commit**

```bash
git add app/controllers/api/v1/base_controller.rb
git commit -m "Add require_confirmed_swap! API guard"
```

---

## Task 3: `POST /api/v1/vote`

**Files:**
- Create: `app/controllers/api/v1/vote_controller.rb`
- Modify: `config/routes.rb`
- Test: `spec/requests/api/v1/vote_spec.rb`

- [ ] **Step 1: Write the failing request spec**

Create `spec/requests/api/v1/vote_spec.rb`:

```ruby
require "rails_helper"

RSpec.describe "Api::V1::Vote", type: :request do
  # A confirmed swap between two users, from the chooser's side. Mirrors the
  # setup in spec/requests/api/v1/swaps_spec.rb.
  def confirmed_swap_for(user)
    partner = create(:user)
    swap = create(:swap, chosen_user: partner, confirmed: true)
    user.update!(swap: swap)
    partner
  end

  describe "POST /api/v1/vote" do
    it "refuses an unauthenticated caller" do
      post "/api/v1/vote"

      expect(response).to have_http_status(:unauthorized)
      expect(JSON.parse(response.body)["error"]["code"])
        .to eq("unauthenticated")
    end

    it "refuses a user with no swap" do
      sign_in create(:user)

      post "/api/v1/vote"

      expect(response).to have_http_status(:conflict)
      expect(JSON.parse(response.body)["error"]["code"])
        .to eq("swap_not_confirmed")
    end

    it "refuses a user whose swap is not confirmed" do
      user = create(:user)
      swap = create(:swap, chosen_user: create(:user), confirmed: false)
      user.update!(swap: swap)
      sign_in user

      post "/api/v1/vote"

      expect(response).to have_http_status(:conflict)
      expect(JSON.parse(response.body)["error"]["code"])
        .to eq("swap_not_confirmed")
    end

    it "records the vote and emails the partner exactly once" do
      user = create(:user)
      partner = confirmed_swap_for(user)
      sign_in user

      expect(UserMailer).to receive(:partner_has_voted)
        .with(partner).once.and_return(double(deliver_now: true))

      post "/api/v1/vote"

      expect(response).to have_http_status(:ok)
      expect(user.reload.has_voted).to be(true)
    end

    it "answers with the session payload" do
      user = create(:user)
      confirmed_swap_for(user)
      sign_in user
      allow(UserMailer).to receive(:partner_has_voted)
        .and_return(double(deliver_now: true))

      post "/api/v1/vote"

      body = JSON.parse(response.body)
      expect(body["currentUser"]["hasVoted"]).to be(true)
      expect(body).to have_key("flags")
      expect(body).to have_key("appMode")
    end

    it "is idempotent: a repeat sends no second email" do
      user = create(:user)
      confirmed_swap_for(user)
      user.update!(has_voted: true)
      sign_in user

      expect(UserMailer).not_to receive(:partner_has_voted)

      post "/api/v1/vote"

      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["currentUser"]["hasVoted"]).to be(true)
    end
  end
end
```

Check `spec/requests/api/v1/swaps_spec.rb` before running: if its swap setup differs from `confirmed_swap_for` above (association names, factory traits), copy its idiom exactly — the factories are the source of truth, not this plan.

- [ ] **Step 2: Add the route**

In `config/routes.rb`, inside `namespace :api do namespace :v1 do`, immediately after the `resource :swap` / `resources :potential_swaps` lines:

```ruby
      # Ported from User::VoteController; /user/vote keeps serving HAML.
      # Write-only: everything the screen reads is already on the session
      # payload or GET /api/v1/swap.
      resource :vote, only: [:create], controller: "vote"
```

- [ ] **Step 3: Run the spec to verify it fails**

```bash
PATH="$HOME/.rbenv/shims:$PATH" bundle exec rspec spec/requests/api/v1/vote_spec.rb
```

Expected: FAIL — `uninitialized constant Api::V1::VoteController`.

- [ ] **Step 4: Write the controller**

Create `app/controllers/api/v1/vote_controller.rb`:

```ruby
module Api
  module V1
    # "I've voted" — ports User::VoteController#create.
    #
    # There is deliberately no #show. Everything the React screen reads
    # already exists: `hasVoted` and the willing party ride on the session
    # payload, and the partner's name comes from GET /api/v1/swap, which
    # discloses it only on a confirmed swap — exactly this endpoint's gate.
    #
    # No phase gate, matching the legacy controller: it has only
    # `require_login` and `require_swap`, and in particular is not gated on
    # `voting_open?`.
    class VoteController < BaseController
      include SessionPayload

      before_action :require_logged_in!
      before_action :require_confirmed_swap!

      def create
        # Idempotent. The legacy controller sets and mails unconditionally,
        # every call; in HAML the button disappears once voted, so a second
        # send was hard to trigger, but a JSON endpoint is a double-click
        # away from one. It never intended a second email — nothing guarded
        # against it.
        return render_session_payload if current_user.has_voted

        current_user.update!(has_voted: true)
        UserMailer.partner_has_voted(current_user.swapped_with).deliver_now

        render_session_payload
      end
    end
  end
end
```

- [ ] **Step 5: Run the spec to verify it passes**

```bash
PATH="$HOME/.rbenv/shims:$PATH" bundle exec rspec spec/requests/api/v1/vote_spec.rb
```

Expected: PASS, 6 examples.

- [ ] **Step 6: Run the whole backend suite and rubocop**

```bash
PATH="$HOME/.rbenv/shims:$PATH" bundle exec rspec && PATH="$HOME/.rbenv/shims:$PATH" bundle exec rubocop
```

Expected: both clean. `spec/views/user/vote/show.html.haml_spec.rb` must still pass — the legacy screen is untouched.

- [ ] **Step 7: Commit**

```bash
git add app/controllers/api/v1/vote_controller.rb config/routes.rb spec/requests/api/v1/vote_spec.rb
git commit -m "Add POST /api/v1/vote"
```

---

## Task 4: `recordVote` client mutation

**Files:**
- Create: `app/frontend/lib/vote.ts`
- Test: `app/frontend/lib/vote.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `app/frontend/lib/vote.test.tsx`:

```typescript
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { apiClient } from "@/lib/apiClient";
import { useRecordVote } from "@/lib/vote";
import { sessionQueryKey } from "@/contexts/SessionContext";

vi.mock("@/lib/apiClient", () => ({
  apiClient: { post: vi.fn() },
}));

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

describe("useRecordVote", () => {
  it("posts to /vote and primes the session cache from the response", async () => {
    const session = { appMode: "open", currentUser: { hasVoted: true } };
    vi.mocked(apiClient.post).mockResolvedValue(session);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result } = renderHook(() => useRecordVote(), {
      wrapper: wrapper(client),
    });
    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(apiClient.post).toHaveBeenCalledWith("/vote");
    expect(client.getQueryData(sessionQueryKey)).toEqual(session);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
corepack yarn test app/frontend/lib/vote.test.tsx
```

Expected: FAIL — cannot resolve `@/lib/vote`.

- [ ] **Step 3: Write the implementation**

Create `app/frontend/lib/vote.ts`:

```typescript
import {
  useMutation,
  type UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import { sessionQueryKey } from "@/contexts/SessionContext";
import { apiClient } from "@/lib/apiClient";
import type { SessionPayload } from "@/types/api";

const votePath = "/vote";

/**
 * Records "I've voted", which also emails the swap partner server-side.
 *
 * The endpoint answers with the whole session payload rather than a bare
 * acknowledgement, so priming the session cache from the response updates
 * `hasVoted` everywhere without a refetch. Safe to fire twice: the server is
 * idempotent and sends no second email.
 */
export function useRecordVote(): UseMutationResult<
  SessionPayload,
  Error,
  void
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.post<SessionPayload>(votePath),
    onSuccess: (session) => {
      queryClient.setQueryData(sessionQueryKey, session);
    },
  });
}
```

- [ ] **Step 4: Run it to verify it passes**

```bash
corepack yarn test app/frontend/lib/vote.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/frontend/lib/vote.ts app/frontend/lib/vote.test.tsx
git commit -m "Add useRecordVote mutation"
```

---

## Task 5: `lib/share.ts` — the URL and text builders

**Files:**
- Create: `app/frontend/lib/share.ts`
- Test: `app/frontend/lib/share.test.ts`

Pure functions, moved out of `SocialShare.tsx` so both the dedicated buttons and the fallback row can use them.

- [ ] **Step 1: Write the failing test**

Create `app/frontend/lib/share.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import {
  buildBlueskyHref,
  buildWhatsAppHref,
  emailBody,
  shareText,
  siteUrl,
} from "@/lib/share";
import type { Election } from "@/types/api";

const election = {
  hashtags: "#GeneralElection",
  eventChoice: "General Election",
  dateDm: "4th July",
  constituencyOther: "another constituency",
} as Election;

describe("shareText", () => {
  it("names the election's hashtags and the campaign tag", () => {
    expect(shareText(election)).toContain("#GeneralElection");
    expect(shareText(election)).toContain("#SwapMyVote");
  });
});

describe("buildBlueskyHref", () => {
  it("composes an intent carrying the share text and the live site", () => {
    const href = buildBlueskyHref(election);

    expect(href).toContain("https://bsky.app/intent/compose?text=");
    expect(href).toContain(encodeURIComponent("#GeneralElection"));
    expect(href).toContain(encodeURIComponent(siteUrl));
  });
});

describe("buildWhatsAppHref", () => {
  it("composes a send link carrying the share text and the live site", () => {
    const href = buildWhatsAppHref(election);

    expect(href).toContain("https://api.whatsapp.com/send?text=");
    expect(href).toContain(encodeURIComponent("#GeneralElection"));
    expect(href).toContain(encodeURIComponent(siteUrl));
  });
});

describe("emailBody", () => {
  it("names the election, the date and the other constituency", () => {
    const body = emailBody(election);

    expect(body).toContain("General Election");
    expect(body).toContain("4th July");
    expect(body).toContain("another constituency");
    expect(body).toContain(siteUrl);
  });
});

describe("siteUrl", () => {
  it("is the live site, not the current origin", () => {
    expect(siteUrl).toBe("https://swapmyvote.uk");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
corepack yarn test app/frontend/lib/share.test.ts
```

Expected: FAIL — cannot resolve `@/lib/share`.

- [ ] **Step 3: Write the implementation**

Create `app/frontend/lib/share.ts`:

```typescript
import type { Election } from "@/types/api";

/**
 * The site every share points at. Deliberately not the current origin: a
 * share from a preview or staging host must still send people to the live
 * site. Moved here from SocialShare.tsx.
 */
export const siteUrl = "https://swapmyvote.uk";

/** Ports ApplicationHelper#app_taglines. The helper samples one of two; they
 *  differ only in person, so one is enough here. */
export function shareText(election: Election): string {
  return `I am using Swap My Vote to make my vote count in the ${election.hashtags}\n\n#SwapMyVote`;
}

/** Ports the message array in app/views/user/share/_social.html.haml. */
export function emailBody(election: Election): string {
  return [
    "Hi,",
    "I thought you might be interested to hear about Swap My Vote. It's a website set up to help us make our votes count in elections.",
    `Can you vote in the ${election.eventChoice} on ${election.dateDm}?`,
    `You can swap votes with someone in ${election.constituencyOther} to help both votes count for more. You get to vote for who you really want, and to help someone else do the same - it's a win-win! `,
    siteUrl,
  ].join("\n\n");
}

/** Mirrors tacticalvote's utils/share.ts. */
export function buildBlueskyHref(election: Election): string {
  const text = `${shareText(election)}\n\n${siteUrl}`;
  return `https://bsky.app/intent/compose?text=${encodeURIComponent(text)}`;
}

export function buildWhatsAppHref(election: Election): string {
  const text = `${shareText(election)}\n\n${siteUrl}`;
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}
```

- [ ] **Step 4: Run it to verify it passes**

```bash
corepack yarn test app/frontend/lib/share.test.ts
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add app/frontend/lib/share.ts app/frontend/lib/share.test.ts
git commit -m "Extract share URL and text builders into lib/share"
```

---

## Task 6: `ShareButton` — native share sheet with a `react-share` fallback

**Files:**
- Create: `app/frontend/components/share/ShareButton.tsx`
- Test: `app/frontend/components/share/ShareButton.test.tsx`
- Modify: `package.json`

- [ ] **Step 1: Add the dependency**

```bash
corepack yarn add react-share
```

Then confirm it resolved without a peer-dependency warning about React 19:

```bash
corepack yarn info react-share --json | head -5
```

- [ ] **Step 2: Write the failing test**

Create `app/frontend/components/share/ShareButton.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShareButton } from "@/components/share/ShareButton";
import type { Election } from "@/types/api";

const election = {
  hashtags: "#GeneralElection",
  eventChoice: "General Election",
  dateDm: "4th July",
  constituencyOther: "another constituency",
} as Election;

/** navigator.share is absent in jsdom, so both branches are set up by hand. */
function withNativeShare(share: () => Promise<void>) {
  Object.defineProperty(window.navigator, "share", {
    value: share,
    configurable: true,
    writable: true,
  });
}

afterEach(() => {
  // biome-ignore lint/performance/noDelete: restoring the absent-API branch needs the property gone, not undefined.
  delete (window.navigator as { share?: unknown }).share;
  vi.restoreAllMocks();
});

describe("ShareButton", () => {
  it("fires the OS share sheet when navigator.share exists", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    withNativeShare(share);
    render(<ShareButton election={election} />);

    await userEvent.click(
      screen.getByRole("button", { name: /share with friends/i }),
    );

    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ url: "https://swapmyvote.uk" }),
    );
  });

  it("does not render the fallback row when native share exists", () => {
    withNativeShare(vi.fn());
    render(<ShareButton election={election} />);

    expect(
      screen.queryByRole("button", { name: "Share on Reddit" }),
    ).not.toBeInTheDocument();
  });

  it("renders a platform row when navigator.share is unavailable", () => {
    render(<ShareButton election={election} />);

    for (const name of [
      "Share on WhatsApp",
      "Share on Bluesky",
      "Share on Facebook",
      "Share on LinkedIn",
      "Share on Reddit",
      "Share on Telegram",
      "Share on Email",
    ]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });

  it("never offers X", () => {
    render(<ShareButton election={election} />);

    expect(screen.queryByRole("button", { name: /on X$/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /twitter/i })).toBeNull();
  });

  it("stays quiet when the user dismisses the share sheet", async () => {
    const abort = Object.assign(new Error("dismissed"), {
      name: "AbortError",
    });
    withNativeShare(vi.fn().mockRejectedValue(abort));
    render(<ShareButton election={election} />);

    await userEvent.click(
      screen.getByRole("button", { name: /share with friends/i }),
    );

    expect(screen.queryByRole("status")).toBeNull();
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

```bash
corepack yarn test app/frontend/components/share/ShareButton.test.tsx
```

Expected: FAIL — cannot resolve `@/components/share/ShareButton`.

- [ ] **Step 4: Write the implementation**

Create `app/frontend/components/share/ShareButton.tsx`:

```typescript
import { useState } from "react";
import Button from "react-bootstrap/Button";
import { FaShareNodes } from "react-icons/fa6";
import {
  BlueskyIcon,
  BlueskyShareButton,
  EmailIcon,
  EmailShareButton,
  FacebookIcon,
  FacebookShareButton,
  LinkedinIcon,
  LinkedinShareButton,
  RedditIcon,
  RedditShareButton,
  TelegramIcon,
  TelegramShareButton,
  WhatsappIcon,
  WhatsappShareButton,
} from "react-share";
import { emailBody, shareText, siteUrl } from "@/lib/share";
import type { Election } from "@/types/api";

const iconSize = 40;

/**
 * Whether this browser can open the OS share sheet.
 *
 * Read once at module scope, not in an effect: the SPA is entirely
 * client-rendered, so there is no server-rendered pass to reconcile with and
 * nothing to flicker. (This is the defect that stalled the same change in
 * tacticalvote, where Next server-renders the fallback row first — see
 * forwarddemocracy/tacticalvote#971.)
 */
const canNativeShare =
  typeof navigator !== "undefined" && typeof navigator.share === "function";

/**
 * The generic share affordance: the OS share sheet where it exists, otherwise
 * a row of per-platform buttons.
 *
 * X is deliberately absent from both branches. The legacy HAML site keeps its
 * X button until M9 removes it wholesale.
 */
export function ShareButton({ election }: { election: Election }) {
  const [copied, setCopied] = useState(false);
  const text = shareText(election);

  async function share() {
    try {
      await navigator.share({ title: "Swap My Vote", text, url: siteUrl });
    } catch (error) {
      // A dismissed sheet is not a failure — say nothing. Anything else means
      // the sheet never opened, so fall back to the clipboard.
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      await navigator.clipboard.writeText(siteUrl);
      setCopied(true);
    }
  }

  if (canNativeShare) {
    return (
      <>
        <Button variant="primary" className="w-100" onClick={share}>
          <FaShareNodes aria-hidden="true" /> Share with friends &amp; family
        </Button>
        {copied && (
          <p className="small mb-0 mt-2 text-center" role="status">
            Link copied
          </p>
        )}
      </>
    );
  }

  return (
    <div className="d-flex flex-wrap gap-2 justify-content-center">
      <WhatsappShareButton url={siteUrl} title={text} aria-label="Share on WhatsApp">
        <WhatsappIcon size={iconSize} round />
      </WhatsappShareButton>
      <BlueskyShareButton url={siteUrl} title={text} aria-label="Share on Bluesky">
        <BlueskyIcon size={iconSize} round />
      </BlueskyShareButton>
      <FacebookShareButton url={siteUrl} aria-label="Share on Facebook">
        <FacebookIcon size={iconSize} round />
      </FacebookShareButton>
      <LinkedinShareButton
        url={siteUrl}
        title="Swap My Vote"
        summary={text}
        source="Swap My Vote"
        aria-label="Share on LinkedIn"
      >
        <LinkedinIcon size={iconSize} round />
      </LinkedinShareButton>
      <RedditShareButton url={siteUrl} title={text} aria-label="Share on Reddit">
        <RedditIcon size={iconSize} round />
      </RedditShareButton>
      <TelegramShareButton url={siteUrl} title={text} aria-label="Share on Telegram">
        <TelegramIcon size={iconSize} round />
      </TelegramShareButton>
      {/* The long recruitment message only fits a channel with a body, so it
          rides here rather than on the sheet. */}
      <EmailShareButton
        url={siteUrl}
        subject="SwapMyVote"
        body={emailBody(election)}
        aria-label="Share on Email"
      >
        <EmailIcon size={iconSize} round />
      </EmailShareButton>
    </div>
  );
}
```

- [ ] **Step 5: Run it to verify it passes**

```bash
corepack yarn test app/frontend/components/share/ShareButton.test.tsx
```

Expected: PASS, 5 tests.

If the platform-row tests fail on the accessible name, inspect what `react-share` actually renders — it wraps children in a `<button>` and may not forward `aria-label`. If it does not, wrap each in a `<span>` with the label, or assert on `title` instead; adjust the test to match reality rather than forcing the component into an awkward shape.

- [ ] **Step 6: Commit**

```bash
git add app/frontend/components/share/ShareButton.tsx app/frontend/components/share/ShareButton.test.tsx package.json yarn.lock
git commit -m "Add ShareButton: native share sheet with a react-share fallback row"
```

---

## Task 7: Rewrite `SocialShare` around `ShareButton`

**Files:**
- Modify: `app/frontend/components/share/SocialShare.tsx` (full rewrite)
- Modify: `app/frontend/components/share/SocialShare.test.tsx` (full rewrite)
- Modify: `app/frontend/styles/globals.scss:187-210`

Its two call sites — `SearchingForSwap.tsx:48` and `ConfirmOutgoingSwap.tsx:65` — keep their import unchanged and both already mock `SocialShare` in their own tests, so they need no edit.

- [ ] **Step 1: Rewrite the test**

Replace the whole of `app/frontend/components/share/SocialShare.test.tsx` with:

```typescript
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SocialShare } from "@/components/share/SocialShare";

const useElection = vi.hoisted(() => vi.fn());
vi.mock("@/lib/referenceData", () => ({ useElection }));
vi.mock("@/components/share/ShareButton", () => ({
  ShareButton: () => <div data-testid="share-button" />,
}));

describe("SocialShare", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useElection.mockReturnValue({
      data: {
        hashtags: "#GeneralElection",
        eventChoice: "General Election",
        dateDm: "4th July",
        constituencyOther: "another constituency",
      },
    });
  });

  it("offers WhatsApp with the election's share text", () => {
    render(<SocialShare />);

    const href =
      screen.getByRole("link", { name: /WhatsApp/ }).getAttribute("href") ?? "";
    expect(href).toContain("api.whatsapp.com/send");
    expect(href).toContain(encodeURIComponent("#GeneralElection"));
  });

  it("offers Bluesky with the election's share text", () => {
    render(<SocialShare />);

    const href =
      screen.getByRole("link", { name: /Bluesky/ }).getAttribute("href") ?? "";
    expect(href).toContain("bsky.app/intent/compose");
    expect(href).toContain(encodeURIComponent("#GeneralElection"));
  });

  it("delegates the generic share to ShareButton", () => {
    render(<SocialShare />);

    expect(screen.getByTestId("share-button")).toBeInTheDocument();
  });

  it("no longer offers Facebook or X directly", () => {
    render(<SocialShare />);

    expect(screen.queryByRole("button", { name: /Facebook/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Twitter/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Twitter/ })).toBeNull();
  });

  it("renders nothing until the election has loaded", () => {
    useElection.mockReturnValue({ data: undefined });

    const { container } = render(<SocialShare />);

    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
corepack yarn test app/frontend/components/share/SocialShare.test.tsx
```

Expected: FAIL — the current component renders Facebook/Twitter buttons and no WhatsApp link.

- [ ] **Step 3: Rewrite the component**

Replace the whole of `app/frontend/components/share/SocialShare.tsx` with:

```typescript
import Button from "react-bootstrap/Button";
import { FaBluesky, FaWhatsapp } from "react-icons/fa6";
import { ShareButton } from "@/components/share/ShareButton";
import { buildBlueskyHref, buildWhatsAppHref } from "@/lib/share";
import { useElection } from "@/lib/referenceData";

/**
 * The share block, used wherever the SPA asks someone to spread the word.
 *
 * Takes tacticalvote's ShareBox shape — a dedicated WhatsApp button, a
 * dedicated Bluesky button, then the generic ShareButton — rather than the
 * Facebook/X/email popups of the legacy `user/share/_social` partial it
 * replaced. X is gone from the React site entirely; the HAML site keeps its
 * own buttons until M9.
 *
 * The dedicated WhatsApp button duplicates the one in ShareButton's fallback
 * row. That is deliberate: the row only appears when navigator.share is
 * absent, which is mostly desktop, where a WhatsApp Web link is still useful.
 */
export function SocialShare() {
  const election = useElection();

  if (!election.data) {
    return null;
  }

  return (
    <div className="d-flex flex-column gap-2">
      <Button
        variant="light"
        className="w-100"
        href={buildWhatsAppHref(election.data)}
        target="_blank"
        rel="noreferrer"
      >
        <FaWhatsapp aria-hidden="true" /> Share on WhatsApp
      </Button>
      <Button
        variant="light"
        className="w-100"
        href={buildBlueskyHref(election.data)}
        target="_blank"
        rel="noreferrer"
      >
        <FaBluesky aria-hidden="true" /> Share on Bluesky
      </Button>
      <ShareButton election={election.data} />
    </div>
  );
}
```

- [ ] **Step 4: Run it to verify it passes**

```bash
corepack yarn test app/frontend/components/share/SocialShare.test.tsx
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Retire the dead button colours**

In `app/frontend/styles/globals.scss`, the `$facebook-color` / `$twitter-color` / `$email-color` block and its `@each` loop (around lines 187–210) now style buttons no React component renders. Replace the three variables and the loop with:

```scss
// Social-share buttons (SocialShare.tsx). The React site shares via WhatsApp,
// Bluesky and the OS share sheet — the Facebook/Twitter/email button colours
// this block used to define went with the buttons in M8. app/assets/
// stylesheets/button.scss still carries them for the live HAML site, which is
// untouched.
$whatsapp-color: #25d366;
$bluesky-color: #0085ff;

@each $name, $color in (whatsapp: $whatsapp-color, bluesky: $bluesky-color) {
  .btn-#{$name} {
    --#{$prefix}btn-color: #{color-contrast($color)};
    --#{$prefix}btn-bg: #{$color};
    --#{$prefix}btn-border-color: #{$color};
    --#{$prefix}btn-hover-color: #{color-contrast($color)};
    --#{$prefix}btn-hover-bg: #{shade-color($color, 10%)};
    --#{$prefix}btn-hover-border-color: #{shade-color($color, 10%)};
    --#{$prefix}btn-active-color: #{color-contrast($color)};
    --#{$prefix}btn-active-bg: #{shade-color($color, 10%)};
    --#{$prefix}btn-active-border-color: #{shade-color($color, 10%)};
  }
}
```

Then swap `variant="light"` for `variant="whatsapp"` and `variant="bluesky"` on the two buttons in `SocialShare.tsx`, and re-run its test to confirm the accessible names are unchanged.

- [ ] **Step 6: Verify the two call sites still pass**

```bash
corepack yarn test app/frontend/components/swap/
```

Expected: PASS — both mock `SocialShare`, so they are insulated from this rewrite.

- [ ] **Step 7: Commit**

```bash
git add app/frontend/components/share app/frontend/styles/globals.scss
git commit -m "Rewrite SocialShare around WhatsApp, Bluesky and the share sheet"
```

---

## Task 8: `/app/share`

**Files:**
- Create: `app/frontend/pages/Share.tsx`
- Test: `app/frontend/pages/Share.test.tsx`
- Modify: `app/frontend/lib/spaPaths.ts`, `app/frontend/app/App.tsx`, `config/routes.rb`

- [ ] **Step 1: Add the paths and routes**

In `app/frontend/lib/spaPaths.ts`, add to the `spaPaths` object after `swapNew`:

```typescript
  share: "/app/share",
  vote: "/app/vote",
```

In `config/routes.rb`, after the M7 block (`get "app/swap/new/:user_id"`):

```ruby
  # M8 vote and share. /user/vote and /user/share keep serving HAML.
  get "app/share", to: "spa#index"
  get "app/vote", to: "spa#index"
```

In `app/frontend/app/App.tsx`, import both pages alongside the others and add two routes after `spaPaths.swapNew`:

```typescript
                  <Route path={spaPaths.share} element={<Share />} />
                  <Route path={spaPaths.vote} element={<Vote />} />
```

(`Vote` lands in task 9; add its route then, or add both now and accept a broken build until task 9 — prefer adding `share` here and `vote` in task 9.)

- [ ] **Step 2: Write the failing test**

Create `app/frontend/pages/Share.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { Share } from "@/pages/Share";

vi.mock("@/components/auth/RequireLogin", () => ({
  RequireLogin: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/auth/RequireSwappingOpen", () => ({
  RequireSwappingOpen: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));
vi.mock("@/components/share/SocialShare", () => ({
  SocialShare: () => <div data-testid="social-share" />,
}));

describe("Share", () => {
  it("explains that a search is under way and offers the share block", () => {
    render(
      <MemoryRouter>
        <Share />
      </MemoryRouter>,
    );

    expect(
      screen.getByText(/looking for someone for you to swap with/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId("social-share")).toBeInTheDocument();
  });

  it("offers a way to skip to the dashboard", () => {
    render(
      <MemoryRouter>
        <Share />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /no thanks/i })).toHaveAttribute(
      "href",
      "/app/dashboard",
    );
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

```bash
corepack yarn test app/frontend/pages/Share.test.tsx
```

Expected: FAIL — cannot resolve `@/pages/Share`.

- [ ] **Step 4: Write the page**

Create `app/frontend/pages/Share.tsx`:

```typescript
import Container from "react-bootstrap/Container";
import { FaMagnifyingGlass } from "react-icons/fa6";
import { Link } from "react-router-dom";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { RequireSwappingOpen } from "@/components/auth/RequireSwappingOpen";
import { SocialShare } from "@/components/share/SocialShare";
import { spaPaths } from "@/lib/spaPaths";

/**
 * Ports app/views/user/share/show.html.haml, including
 * User::ShareController's `require_swapping_open` and `require_login`.
 *
 * Nothing in the legacy site links to /user/share — no view, helper or
 * controller references `user_share_path` — so this ports a screen that has
 * been dark. It is ported anyway so cutover stays a like-for-like flip;
 * whether to delete it is an M9 question.
 */
export function Share() {
  return (
    <RequireLogin>
      <RequireSwappingOpen>
        <Container className="container-narrow py-4">
          <p className="text-center">
            <FaMagnifyingGlass aria-hidden="true" className="me-2" />
            Thanks! We're looking for someone for you to swap with.
          </p>

          <p className="text-center">
            Would you like to share Swap My Vote before we continue? This will
            help us to find more people that you could swap your vote with.
          </p>

          <SocialShare />

          <p className="text-center small mt-3">
            <Link to={spaPaths.dashboard}>No Thanks, Skip &raquo;</Link>
          </p>
        </Container>
      </RequireSwappingOpen>
    </RequireLogin>
  );
}
```

- [ ] **Step 5: Run it to verify it passes**

```bash
corepack yarn test app/frontend/pages/Share.test.tsx
```

Expected: PASS, 2 tests.

- [ ] **Step 6: Commit**

```bash
git add app/frontend/pages/Share.tsx app/frontend/pages/Share.test.tsx app/frontend/lib/spaPaths.ts app/frontend/app/App.tsx config/routes.rb
git commit -m "Add /app/share"
```

---

## Task 9: `/app/vote`

**Files:**
- Create: `app/frontend/pages/Vote.tsx`
- Test: `app/frontend/pages/Vote.test.tsx`
- Modify: `app/frontend/app/App.tsx`

- [ ] **Step 1: Write the failing test**

Create `app/frontend/pages/Vote.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Vote } from "@/pages/Vote";

const useSession = vi.hoisted(() => vi.fn());
const useSwap = vi.hoisted(() => vi.fn());
const mutate = vi.hoisted(() => vi.fn());

vi.mock("@/contexts/useSession", () => ({ useSession }));
vi.mock("@/lib/swap", () => ({ useSwap }));
vi.mock("@/lib/vote", () => ({
  useRecordVote: () => ({ mutate, isPending: false }),
}));
vi.mock("@/components/auth/RequireLogin", () => ({
  RequireLogin: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/share/SocialShare", () => ({
  SocialShare: () => <div data-testid="social-share" />,
}));

function setUp({ hasVoted = false, confirmed = true } = {}) {
  useSession.mockReturnValue({
    session: {
      currentUser: {
        hasVoted,
        willingParty: { name: "Green Party" },
      },
    },
  });
  useSwap.mockReturnValue({
    isPending: false,
    data: confirmed ? { confirmed: true, partner: { name: "Sam" } } : null,
  });
}

describe("Vote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderPage() {
    return render(
      <MemoryRouter>
        <Vote />
      </MemoryRouter>,
    );
  }

  it("offers the button naming the party they are voting for", () => {
    setUp();
    renderPage();

    expect(
      screen.getByRole("button", { name: "Yes, I've voted! (for Green Party)" }),
    ).toBeInTheDocument();
  });

  it("names the partner it will email", () => {
    setUp();
    renderPage();

    expect(screen.getByText(/Sam/)).toBeInTheDocument();
  });

  it("records the vote when the button is pressed", async () => {
    setUp();
    renderPage();

    await userEvent.click(
      screen.getByRole("button", { name: /Yes, I've voted/ }),
    );

    expect(mutate).toHaveBeenCalled();
  });

  it("thanks a user who has already voted and offers sharing", () => {
    setUp({ hasVoted: true });
    renderPage();

    expect(screen.getByText(/Thanks!/)).toBeInTheDocument();
    expect(screen.getByText(/Sam/)).toBeInTheDocument();
    expect(screen.getByTestId("social-share")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /I've voted/ })).toBeNull();
  });

  it("sends a user without a confirmed swap to the dashboard", () => {
    setUp({ confirmed: false });
    renderPage();

    expect(screen.queryByRole("button", { name: /I've voted/ })).toBeNull();
  });

  it("waits for the swap poll rather than bouncing mid-load", () => {
    setUp();
    useSwap.mockReturnValue({ isPending: true, data: undefined });
    renderPage();

    expect(screen.queryByRole("button", { name: /I've voted/ })).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
corepack yarn test app/frontend/pages/Vote.test.tsx
```

Expected: FAIL — cannot resolve `@/pages/Vote`.

- [ ] **Step 3: Write the page**

Create `app/frontend/pages/Vote.tsx`:

```typescript
import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";
import Spinner from "react-bootstrap/Spinner";
import { Navigate } from "react-router-dom";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { SocialShare } from "@/components/share/SocialShare";
import { useSession } from "@/contexts/useSession";
import { spaPaths } from "@/lib/spaPaths";
import { useSwap } from "@/lib/swap";
import { useRecordVote } from "@/lib/vote";

/**
 * Ports app/views/user/vote/show.html.haml and User::VoteController.
 *
 * The legacy `require_swap` guard tests `swapped?` — any swap — and the view
 * then prints the partner's real name. This requires a *confirmed* swap
 * instead, the client mirror of require_confirmed_swap!: it is the only state
 * the screen is reachable in (shared/_go_vote links here only when
 * `swap_confirmed?`), and it is the state in which the server will disclose
 * the partner's name at all.
 */
export function Vote() {
  const { session } = useSession();
  const user = session?.currentUser ?? null;
  const swap = useSwap(user !== null);
  const recordVote = useRecordVote();

  // Guarded on isPending for the same reason Dashboard is: a user with a
  // perfectly good swap must not be bounced while the poll is still loading.
  if (user && !swap.isPending && !swap.data?.confirmed) {
    return <Navigate to={spaPaths.dashboard} replace />;
  }

  const partnerName = swap.data?.partner?.name ?? "your swap partner";
  const partyName = user?.willingParty?.name ?? "";

  return (
    <RequireLogin>
      <Container className="container-narrow py-4">
        {swap.isPending && (
          <div className="text-center">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading</span>
            </Spinner>
          </div>
        )}

        {swap.data?.confirmed && !user?.hasVoted && (
          <>
            <p className="text-center">Please let us know when you've voted...</p>
            <p className="text-center">
              <Button
                variant="primary"
                disabled={recordVote.isPending}
                onClick={() => {
                  recordVote.mutate();
                }}
              >
                Yes, I've voted! (for {partyName})
              </Button>
            </p>
            <p className="text-center subdued">
              We'll email your swap partner, {partnerName}, and let them know
              that you've voted <strong>{partyName}</strong> for them.
            </p>
          </>
        )}

        {swap.data?.confirmed && user?.hasVoted && (
          <>
            <p className="text-center">
              Thanks! We've emailed {partnerName} to let them know that you've
              voted <strong>{partyName}</strong> for them.
            </p>
            <SocialShare />
          </>
        )}
      </Container>
    </RequireLogin>
  );
}
```

- [ ] **Step 4: Run it to verify it passes**

```bash
corepack yarn test app/frontend/pages/Vote.test.tsx
```

Expected: PASS, 6 tests.

- [ ] **Step 5: Add the route**

In `app/frontend/app/App.tsx`, import `Vote` from `@/pages/Vote` and add, after the `share` route:

```typescript
                  <Route path={spaPaths.vote} element={<Vote />} />
```

- [ ] **Step 6: Point `GoVote` at the SPA**

In `app/frontend/components/home/GoVote.tsx`, replace the full-page anchor with a router link. Add the imports:

```typescript
import { Link } from "react-router-dom";
import { spaPaths } from "@/lib/spaPaths";
```

and replace the anchor and its preceding comment:

```typescript
          <Link to={spaPaths.vote}>let your swap partner know you've voted!</Link>
```

This removes the last "Still HAML" link in the SPA.

- [ ] **Step 7: Verify the home tests still pass**

```bash
corepack yarn test app/frontend/components/home/ app/frontend/pages/Home.test.tsx
```

Expected: PASS. If a test asserted the old `/user/vote` href, update it to `/app/vote` — that is the intended change.

- [ ] **Step 8: Commit**

```bash
git add app/frontend/pages/Vote.tsx app/frontend/pages/Vote.test.tsx app/frontend/app/App.tsx app/frontend/components/home/GoVote.tsx
git commit -m "Add /app/vote and route GoVote to it"
```

---

## Task 10: Playwright and axe coverage

**Files:**
- Modify: `playwright-tests/support/seedProfileUser.ts`
- Create: `playwright-tests/vote.spec.ts`
- Modify: `playwright-tests/accessibility.spec.ts`

The vote screen needs a **confirmed** swap, and `seedSwapPair` deliberately calls
`clear_swap` so every run starts unswapped. Driving two accounts through offer
and confirm in the UI just to reach this screen would double the runtime and
duplicate what `swap.spec.ts` already covers — so seed the confirmed swap
directly instead.

- [ ] **Step 1: Add a confirmed-swap seed helper**

In `playwright-tests/support/seedProfileUser.ts`, after `seedSwapPair`, add:

```typescript
/**
 * A swap pair that is already confirmed, for screens that only exist past
 * confirmation. Builds on seedSwapPair — which clears any existing swap — then
 * creates the swap directly rather than driving offer-and-confirm through the
 * UI, which swap.spec.ts already covers and which would double this file's
 * runtime.
 *
 * `has_voted` is reset too, so a re-run starts from the same place as a first
 * run.
 */
export function seedConfirmedSwapPair(suffix = ""): SwapPair {
  const pair = seedSwapPair(suffix);

  const script = `
    chooser = User.find_by!(email: "${pair.chooser.email}")
    chosen = User.find_by!(email: "${pair.chosen.email}")

    swap = Swap.create!(chosen_user: chosen, confirmed: true,
                        consent_share_email_chooser: true,
                        consent_share_email_chosen: true)
    chooser.update!(swap: swap, has_voted: false)
    chosen.update!(has_voted: false)
  `;

  execFileSync("bin/rails", ["runner", script], {
    stdio: "inherit",
    env: railsEnv,
  });

  return pair;
}
```

Check `app/models/swap.rb` before running: if `Swap` requires the chooser to be
set through `User#swap` rather than a column on the swap (M7's
`SwapDetailSerializer` notes `choosing_user` is a `has_one` over `users.swap_id`),
the `chooser.update!(swap: swap)` above is what establishes it — which is why it
is written that way rather than passing a `choosing_user:` to `create!`.

- [ ] **Step 2: Write the failing spec**

Create `playwright-tests/vote.spec.ts`:

```typescript
import { expect, test } from "@playwright/test";
import { spaPaths } from "@/lib/spaPaths";
import { signIn } from "./support/auth";
import {
  seedConfirmedSwapPair,
  seedProfileUser,
} from "./support/seedProfileUser";

// Serial for the same reason swap.spec.ts is: both tests below act on the one
// shared pair, and the first mutates has_voted.
test.describe.configure({ mode: "serial" });

const pair = seedConfirmedSwapPair("-vote");
const noSwapUser = seedProfileUser("-vote-noswap");

test.describe("/app/vote", () => {
  test("records a vote and then offers sharing", async ({ page }) => {
    await signIn(page, pair.chooser);
    await page.goto(spaPaths.vote);

    const voted = page.getByRole("button", { name: /Yes, I've voted/ });
    await expect(voted).toBeVisible();
    await voted.click();

    await expect(page.getByText(/Thanks!/)).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Share on Bluesky/ }),
    ).toBeVisible();
    await expect(voted).toBeHidden();
  });

  test("sends a user without a confirmed swap to the dashboard", async ({
    page,
  }) => {
    await signIn(page, noSwapUser);

    await page.goto(spaPaths.vote);

    await expect(page).toHaveURL(new RegExp(`${spaPaths.dashboard}$`));
  });
});
```

- [ ] **Step 3: Run it**

```bash
corepack yarn e2e playwright-tests/vote.spec.ts
```

Expected: PASS, 2 tests. Needs `foreman` on PATH (`gem install foreman`) and a
development database (`bin/rails db:create db:schema:load`).

If the second test lands on `/app/swap` rather than `/app/dashboard`, that is
`Dashboard`'s own "no swap" redirect chaining after this page's — assert the
final URL it actually reaches rather than fighting it; both are correct
behaviour and the point of the test is that `/app/vote` refuses.

- [ ] **Step 4: Add `/app/share` to the signed-in axe sweep**

`Share` renders behind `RequireLogin` and `RequireSwappingOpen` but needs no
swap, so it belongs in the existing `signedInPages` array in
`playwright-tests/accessibility.spec.ts`, alongside Profile and Mobile. Add
after the `Swap` entry:

```typescript
  {
    name: "Share",
    path: spaPaths.share,
    ready: (page) =>
      page.getByRole("link", { name: /No Thanks, Skip/ }),
  },
```

The `ready` locator waits for the skip link rather than the heading, matching
the reasoning in that file's comment: `SocialShare` returns null until the
election query resolves, so a heading-only wait would let axe scan the page
before the share buttons exist.

- [ ] **Step 5: Add `/app/vote` to the axe sweep**

`/app/vote` needs a confirmed swap, so it cannot join `signedInPages` — that
fixture user has none. Add a separate test after the existing M7 offer-and-
dashboard scan:

```typescript
// The M8 vote screen, which only exists once a swap is confirmed — so it gets
// its own already-confirmed pair rather than joining signedInPages above.
const axeVotePair = seedConfirmedSwapPair("-axe-vote");

test("must report no WCAG A/AA violations when the vote page is rendered", async ({
  page,
}, testInfo) => {
  await signIn(page, axeVotePair.chooser);
  await page.goto(spaPaths.vote);
  await expect(
    page.getByRole("button", { name: /Yes, I've voted/ }),
  ).toBeVisible();

  const { violations } = await new AxeBuilder({ page })
    .withTags(wcagTags)
    .analyze();

  if (violations.length > 0) {
    await testInfo.attach("axe-violations.json", {
      body: JSON.stringify(violations, null, 2),
      contentType: "application/json",
    });
  }

  expect(
    violations.map(
      (violation) =>
        `${violation.id} (${violation.nodes.length} nodes): ${violation.help}`,
    ),
  ).toEqual([]);
});
```

Add `seedConfirmedSwapPair` to that file's existing import from
`./support/seedProfileUser`.

- [ ] **Step 6: Run the whole E2E suite**

```bash
corepack yarn e2e
```

Expected: PASS. The suite runs `fullyParallel`, and each `seedSwapPair` suffix
gets its own party rows for exactly that reason — `-vote` and `-axe-vote` above
follow that rule, so they cannot generate each other's users as candidates.

- [ ] **Step 7: Commit**

```bash
git add playwright-tests/
git commit -m "Add vote E2E and axe coverage for the new paths"
```

---

## Task 11: Full quality gates and plan documentation

**Files:**
- Modify: `docs/frontend-modernization-plan.md`

- [ ] **Step 1: Run every gate**

```bash
corepack yarn lint:fix && corepack yarn typecheck && corepack yarn test
```

Expected: all clean.

```bash
PATH="$HOME/.rbenv/shims:$PATH" bundle exec rspec && PATH="$HOME/.rbenv/shims:$PATH" bundle exec rubocop
```

Expected: both green, including the untouched `spec/views/user/vote/show.html.haml_spec.rb`.

- [ ] **Step 2: Mark M8 landed**

In `docs/frontend-modernization-plan.md`, replace the M8 bullet with a landed entry in the same voice as M6 and M7 — what was ported, the API added, the deliberate divergences (confirmed-swap gate, idempotent POST, X dropped from React only), the sharing rewrite and the TV issue it resolves, an explicit note that `app/views/user/vote/`, `app/views/user/share/`, `User::VoteController` and `User::ShareController` are untouched and still live, and the tests that cover it.

- [ ] **Step 3: Note the sharing change in the risks section**

Risk 7 in that document lists the jQuery widgets to decommission. Sharing is not one of them, but the plan's M9 cleanup list mentions removing Bootstrap 4 and Sprockets stylesheets — add a line noting that `app/assets/stylesheets/button.scss` still carries the Facebook/Twitter/email button colours for the live HAML site and goes with it at M9.

- [ ] **Step 4: Commit**

```bash
git add docs/frontend-modernization-plan.md
git commit -m "Record M8 as landed in the modernization plan"
```

- [ ] **Step 5: Push and open the PR**

```bash
git push -u origin m8-vote-and-share
```

Then open a PR against `master` describing the port, the three deliberate divergences, and the sharing rewrite, linking [forwarddemocracy/tacticalvote#971](https://github.com/forwarddemocracy/tacticalvote/issues/971).
