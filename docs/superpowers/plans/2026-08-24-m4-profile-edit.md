# M4 — Profile and Constituency Edit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the constituency-onboarding, profile-edit and post-save review screens to React behind `/app/*` preview paths, backed by two new JSON endpoints.

**Architecture:** Rails gains `PATCH /api/v1/user` (profile update, reporting whether a review is required) and `GET /api/v1/constituencies/:ons_id` (constituency plus its polls). React gains three routed pages composed from reusable pieces — a shared `RequireLogin` guard, the M3 constituency picker and postcode lookup, a pure poll-interpretation function, and a Chart.js poll chart split into a thin canvas component and a pure config builder. No canonical route changes.

**Tech Stack:** Rails 6.1 + Alba serializers + RSpec request specs; React 19 + TypeScript + react-router v7 + react-query + react-bootstrap; chart.js 4 + react-chartjs-2 5; Vitest + RTL; Playwright + axe; Biome.

Design spec: [`docs/superpowers/specs/2026-08-23-m4-profile-edit-design.md`](../specs/2026-08-23-m4-profile-edit-design.md).

## Global Constraints

- **No route flips.** All three screens ship under `/app/*`. `/user`, `/user/constituency` and `/user/review` keep serving HAML. Every new path goes in `app/frontend/lib/spaPaths.ts`, the `SpaController` allow-list in `config/routes.rb`, and the `<Routes>` table in `app/frontend/app/App.tsx` — all three, or none.
- **Cross-boundary links are full-page `<a href>`**, never react-router `<Link>`. In-SPA links are `<Link>`.
- **TypeScript style:** always braces in `if`/`else`/`for`/`while` bodies, even for a single statement.
- **Naming:** camelCase for TypeScript constants — never SCREAMING_SNAKE_CASE.
- **Styling:** Bootstrap utility classes first; no inline `style={{…}}` unless the value is dynamic; anything else goes in a co-located `*.module.scss`.
- **Alignment:** form labels and fields are left-aligned. Centring is for hero copy only.
- **Copy:** single-sentence UI copy has no trailing full stop; multi-sentence copy keeps its punctuation. Server error strings are copied **verbatim** from the legacy controllers, trailing stops included.
- **Serializers use `transform_keys :lower_camel`**, so JSON keys are camelCase while Ruby stays snake_case. Every shape is mirrored in `app/frontend/types/api.ts`.
- **Error convention:** `{ "error": { "code", "messages", "fields" } }` via `render_error`.
- **Quality gates before every commit:** `corepack yarn lint:fix`, `corepack yarn typecheck`, `corepack yarn test`, and `bundle exec rspec` when Ruby changed. Ruby commands need the pinned Ruby: prefix with `PATH="$HOME/.rbenv/shims:$PATH"`.
- **Branch:** `frontend-m4-profile-edit`. Never push to `master`; push with `git push -u origin frontend-m4-profile-edit`.

## Decisions that refine the spec

Three points the spec left slightly looser than the implementation needs:

1. **`PATCH /api/v1/user` is not gated on swapping being open.** The legacy `UsersController` gates only `#show` with `require_swapping_open`; `#update` runs in every phase. Gating the endpoint would stop people fixing their email during `closed-wind-down`, which the live site allows. The voting-info lock **is** enforced, matching `restricted_when_voting_open`.
2. **Polls get their own serializer and a separate detail serializer** (`ConstituencyDetailSerializer`) rather than an optional association on `ConstituencySerializer`, so `#index` is provably untouched.
3. **A missing party is a 422 with nothing saved.** The legacy controller saves first and then flashes the error, leaving a half-valid profile behind. The API validates before saving. Deliberate divergence; the legacy screen stays as it is.

## File structure

**Ruby — create**

| File | Responsibility |
| --- | --- |
| `app/controllers/api/v1/users_controller.rb` | `PATCH /api/v1/user` |
| `app/serializers/api/v1/poll_serializer.rb` | One poll row: party naming, colour, votes, marginal scores |
| `app/serializers/api/v1/constituency_detail_serializer.rb` | Constituency + its polls, for `#show` only |
| `spec/requests/api/v1/users_spec.rb` | Request spec for the update endpoint |

**Ruby — modify**

| File | Change |
| --- | --- |
| `app/controllers/api/v1/base_controller.rb` | Add `reject_when_voting_info_locked!` |
| `app/controllers/api/v1/constituencies_controller.rb` | Add `#show` |
| `config/routes.rb` | `resource :user, only: [:update]`; `constituencies` gains `:show` with `param: :ons_id`; three `/app/*` SPA routes |
| `spec/requests/api/v1/reference_data_spec.rb` | Cover `GET /api/v1/constituencies/:ons_id` |

**TypeScript — create**

| File | Responsibility |
| --- | --- |
| `app/frontend/lib/profile.ts` | `updateProfile()` + `useConstituencyDetail()` |
| `app/frontend/lib/pollInterpretation.ts` | Pure port of `_polls_interpretation_self` |
| `app/frontend/components/polls/pollChartConfig.ts` | Pure polls → Chart.js `{ data, options }` |
| `app/frontend/components/polls/PollChart.tsx` | Canvas wrapper, registers what it uses |
| `app/frontend/components/auth/RequireLogin.tsx` | Logged-out fallback shared by the three pages |
| `app/frontend/components/profile/ConstituencyForm.tsx` | Constituency + postcode (+ email when blank) |
| `app/frontend/components/profile/ProfileForm.tsx` | Full profile edit form |
| `app/frontend/components/profile/ProfileReview.tsx` | Chart + interpretation + Proceed/Change |
| `app/frontend/pages/Constituency.tsx`, `Profile.tsx`, `Review.tsx` | Data loading + page chrome |
| `playwright-tests/support/auth.ts` | `signIn(page, …)` through the legacy Devise form |
| `playwright-tests/support/seedProfileUser.ts` | Seeds the E2E user, parties, constituency and polls |
| `playwright-tests/profile.spec.ts` | Edit → review E2E + axe scans |

**TypeScript — modify**

| File | Change |
| --- | --- |
| `app/frontend/types/api.ts` | `ConstituencyPoll`, `ConstituencyDetail`, `ProfileUpdate`, `ProfileUpdateResult` |
| `app/frontend/lib/spaPaths.ts` | `profile`, `constituency`, `review` |
| `app/frontend/app/App.tsx` | Three routes |
| `package.json` | `chart.js`, `react-chartjs-2` |

---

### Task 1: Constituency detail endpoint with polls

**Files:**
- Create: `app/serializers/api/v1/poll_serializer.rb`
- Create: `app/serializers/api/v1/constituency_detail_serializer.rb`
- Modify: `app/controllers/api/v1/constituencies_controller.rb`
- Modify: `config/routes.rb:29`
- Test: `spec/requests/api/v1/reference_data_spec.rb`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `GET /api/v1/constituencies/:ons_id` → `{ onsId, name, polls: [{ partyId, partyName, partyShortName, color, votes, marginalScore, signedMarginalScore }] }`. Polls with `votes == 0` are omitted; the rest are ordered by `votes` descending. 404 `not_found` for an unknown ONS id.

- [ ] **Step 1: Write the failing request specs**

Append to `spec/requests/api/v1/reference_data_spec.rb`, inside the outer `RSpec.describe`:

```ruby
  describe "GET /api/v1/constituencies/:ons_id" do
    let(:constituency) { create(:ons_constituency, name: "Woking", ons_id: "E14001063") }
    let(:labour) { create(:party, name: "Labour", color: "#DC241f") }
    let(:green) { create(:party, name: "Green", color: "#6AB023") }

    it "returns the constituency with its polls, biggest vote first" do
      create(:poll, constituency_ons_id: constituency.ons_id, party_id: green.id, votes: 1200)
      create(:poll, constituency_ons_id: constituency.ons_id, party_id: labour.id, votes: 4210)

      get "/api/v1/constituencies/#{constituency.ons_id}"

      expect(response).to have_http_status(:ok)
      expect(json["onsId"]).to eq "E14001063"
      expect(json["name"]).to eq "Woking"
      expect(json["polls"].map { |poll| poll["partyName"] }).to eq %w[Labour Green]
      expect(json["polls"].first).to include(
        "partyId" => labour.id,
        "partyShortName" => labour.short_name,
        "color" => "#DC241f",
        "votes" => 4210,
        "signedMarginalScore" => 3010
      )
    end

    it "omits parties with no predicted votes, as the legacy chart does" do
      create(:poll, constituency_ons_id: constituency.ons_id, party_id: labour.id, votes: 4210)
      create(:poll, constituency_ons_id: constituency.ons_id, party_id: green.id, votes: 0)

      get "/api/v1/constituencies/#{constituency.ons_id}"

      expect(json["polls"].map { |poll| poll["partyName"] }).to eq %w[Labour]
    end

    it "reports the stored marginal score" do
      create(:poll, constituency_ons_id: constituency.ons_id, party_id: labour.id,
                    votes: 4210, marginal_score: 3010)
      create(:poll, constituency_ons_id: constituency.ons_id, party_id: green.id, votes: 1200)

      get "/api/v1/constituencies/#{constituency.ons_id}"

      expect(json["polls"].first["marginalScore"]).to eq 3010
    end

    it "is available logged out, like the rest of the reference data" do
      get "/api/v1/constituencies/#{constituency.ons_id}"

      expect(response).to have_http_status(:ok)
    end

    it "404s for an ONS id we do not run swaps in" do
      get "/api/v1/constituencies/E99999999"

      expect(response).to have_http_status(:not_found)
      expect(json["error"]["code"]).to eq "not_found"
    end
  end
```

- [ ] **Step 2: Run the specs to verify they fail**

```bash
PATH="$HOME/.rbenv/shims:$PATH" bundle exec rspec spec/requests/api/v1/reference_data_spec.rb
```

Expected: failures — `ActionController::RoutingError` / no route matches.

- [ ] **Step 3: Add the poll serializer**

Create `app/serializers/api/v1/poll_serializer.rb`:

```ruby
module Api
  module V1
    # One party's predicted result in one constituency.
    #
    # Numbers go out raw: `votes` is the stored hundredths-of-a-percent value
    # the legacy PollsHelper divides by 100 for display, and the marginal
    # scores are in the same units. The frontend formats them, so a different
    # chart can be built from the same payload.
    class PollSerializer
      include Alba::Resource

      transform_keys :lower_camel

      attributes :votes, :marginal_score

      attribute :party_id do |poll|
        poll.party.id
      end

      attribute :party_name do |poll|
        poll.party.name
      end

      # The abbreviation the legacy chart labels bars with (PollsHelper).
      attribute :party_short_name do |poll|
        poll.party.short_name
      end

      attribute :color do |poll|
        poll.party.color
      end

      # Derived, not stored: how far ahead (+) or behind (-) this party is of
      # the best of the others. `marginal_score` is its absolute value, but
      # only once the rake task has run, so the sign has to come from here.
      attribute :signed_marginal_score do |poll|
        poll.signed_marginal_score
      end
    end
  end
end
```

- [ ] **Step 4: Add the detail serializer**

Create `app/serializers/api/v1/constituency_detail_serializer.rb`:

```ruby
module Api
  module V1
    # A constituency plus its polls, for the review screen's chart.
    #
    # Separate from ConstituencySerializer so the entry form's `#index` — which
    # returns every constituency — never pays for polls it does not draw.
    class ConstituencyDetailSerializer
      include Alba::Resource

      transform_keys :lower_camel

      attributes :ons_id, :name

      many :polls, resource: PollSerializer
    end
  end
end
```

- [ ] **Step 5: Add the controller action**

In `app/controllers/api/v1/constituencies_controller.rb`, add below `#index`:

```ruby
      # The chart on the review screen: one constituency, with the polls it
      # draws. Public, like #index — the same numbers are already on the
      # legacy swap pages.
      def show
        constituency = OnsConstituency.find_by!(ons_id: params[:ons_id])

        render json: ConstituencyDetailSerializer.new(
          constituency,
          params: { polls: chart_polls(constituency) }
        ).to_h
      end

      private

      # Matches PollsHelper#poll_data_for: parties with no predicted votes are
      # left off the chart entirely, and the rest run biggest first.
      def chart_polls(constituency)
        constituency.polls.reject { |poll| poll.votes.to_i.zero? }
                    .sort_by { |poll| -poll.votes }
      end
```

`find_by!` raises `ActiveRecord::RecordNotFound`, which `BaseController` already turns into the 404 error body.

- [ ] **Step 6: Serialize the filtered, ordered polls**

Alba's `many :polls` would call the association and get every poll in table order, so point it at the prepared list. Replace the `many :polls` line in `constituency_detail_serializer.rb` with:

```ruby
      many :polls, resource: PollSerializer do |_constituency|
        params[:polls]
      end
```

- [ ] **Step 7: Add the route**

In `config/routes.rb`, replace line 29:

```ruby
      resources :constituencies, only: [:index]
```

with:

```ruby
      # `param: :ons_id` because the ONS GSS code is the key the whole domain
      # joins on — we never expose the row id.
      resources :constituencies, only: [:index, :show], param: :ons_id
```

- [ ] **Step 8: Run the specs to verify they pass**

```bash
PATH="$HOME/.rbenv/shims:$PATH" bundle exec rspec spec/requests/api/v1/reference_data_spec.rb
```

Expected: all green, including the pre-existing `#index` examples.

- [ ] **Step 9: Lint Ruby and commit**

```bash
PATH="$HOME/.rbenv/shims:$PATH" bundle exec rubocop app/serializers/api/v1 app/controllers/api/v1 config/routes.rb
git add app/serializers/api/v1/poll_serializer.rb app/serializers/api/v1/constituency_detail_serializer.rb app/controllers/api/v1/constituencies_controller.rb config/routes.rb spec/requests/api/v1/reference_data_spec.rb
git commit -m "Add GET /api/v1/constituencies/:ons_id with its polls"
```

---

### Task 2: Profile update endpoint

**Files:**
- Create: `app/controllers/api/v1/users_controller.rb`
- Modify: `app/controllers/api/v1/base_controller.rb`
- Modify: `config/routes.rb` (inside `namespace :v1`)
- Test: `spec/requests/api/v1/users_spec.rb`

**Interfaces:**
- Consumes: `render_error`, `require_logged_in!` from `Api::V1::BaseController`; `UserSerializer`.
- Produces: `PATCH /api/v1/user`, body `{ preferred_party_id?, willing_party_id?, constituency_ons_id?, email?, consent_news_email? }` → 200 `{ user: <UserSerializer>, reviewRequired: boolean }`. Errors: 401 `unauthenticated`, 403 `voting_info_locked`, 422 `validation_failed`.
- Produces: `reject_when_voting_info_locked!` on `BaseController`, for later milestones.

- [ ] **Step 1: Write the failing request spec**

Create `spec/requests/api/v1/users_spec.rb`:

```ruby
require "rails_helper"

RSpec.describe "Api::V1::Users", type: :request do
  include Devise::Test::IntegrationHelpers

  def json
    JSON.parse(response.body)
  end

  let(:woking) { create(:ons_constituency, name: "Woking", ons_id: "E14001063") }
  let(:other) { create(:ons_constituency, name: "Wakefield", ons_id: "E14001009") }
  let(:green) { create(:party, name: "Green", color: "#6AB023") }
  let(:labour) { create(:party, name: "Labour", color: "#DC241f") }

  let(:user) do
    create(:user,
           email: "voter@example.com",
           constituency_ons_id: woking.ons_id,
           preferred_party: green,
           willing_party: labour)
  end

  describe "PATCH /api/v1/user" do
    context "when logged out" do
      it "401s without touching anything" do
        patch "/api/v1/user", params: { email: "new@example.com" }, as: :json

        expect(response).to have_http_status(:unauthorized)
        expect(json["error"]["code"]).to eq "unauthenticated"
      end
    end

    context "when logged in" do
      before { sign_in user }

      it "updates the profile and reports the user back" do
        patch "/api/v1/user",
              params: { email: "new@example.com", preferred_party_id: labour.id,
                        willing_party_id: green.id,
                        constituency_ons_id: woking.ons_id },
              as: :json

        expect(response).to have_http_status(:ok)
        expect(json["user"]["email"]).to eq "new@example.com"
        expect(json["user"]["preferredParty"]["name"]).to eq "Labour"
        expect(user.reload.willing_party_id).to eq green.id
      end

      it "asks for a review when the willing party changes" do
        patch "/api/v1/user",
              params: { preferred_party_id: green.id, willing_party_id: green.id,
                        constituency_ons_id: woking.ons_id },
              as: :json

        expect(json["reviewRequired"]).to be true
      end

      it "asks for a review when the constituency changes" do
        patch "/api/v1/user",
              params: { preferred_party_id: green.id, willing_party_id: labour.id,
                        constituency_ons_id: other.ons_id },
              as: :json

        expect(json["reviewRequired"]).to be true
      end

      it "does not ask for a review when only the email changes" do
        patch "/api/v1/user",
              params: { email: "same-profile@example.com",
                        preferred_party_id: green.id, willing_party_id: labour.id,
                        constituency_ons_id: woking.ons_id },
              as: :json

        expect(json["reviewRequired"]).to be false
      end

      it "422s with the legacy wording when the willing party is cleared" do
        patch "/api/v1/user",
              params: { preferred_party_id: green.id, willing_party_id: "" },
              as: :json

        expect(response).to have_http_status(:unprocessable_entity)
        expect(json["error"]["code"]).to eq "validation_failed"
        expect(json["error"]["messages"])
          .to include "You must state which party you are willing to vote for."
        expect(user.reload.willing_party_id).to eq labour.id
      end

      it "422s with the legacy wording when the preferred party is cleared" do
        patch "/api/v1/user", params: { preferred_party_id: "" }, as: :json

        expect(json["error"]["messages"])
          .to include "You must state which party you would prefer to vote for."
      end

      it "422s with the legacy wording when the constituency is cleared" do
        patch "/api/v1/user", params: { constituency_ons_id: "" }, as: :json

        expect(response).to have_http_status(:unprocessable_entity)
        expect(json["error"]["messages"]).to include(
          "You must tell us your constituency. Without it, the swaps we offer may not make sense."
        )
      end

      it "422s on an invalid email, reporting the field" do
        patch "/api/v1/user", params: { email: "not-an-email" }, as: :json

        expect(response).to have_http_status(:unprocessable_entity)
        expect(json["error"]["fields"]).to have_key "email"
        expect(user.reload.email).to eq "voter@example.com"
      end

      it "leaves fields alone when they are not sent" do
        patch "/api/v1/user", params: { email: "kept@example.com" }, as: :json

        expect(response).to have_http_status(:ok)
        expect(user.reload.willing_party_id).to eq labour.id
        expect(user.constituency_ons_id).to eq woking.ons_id
      end
    end

    context "when voting is open and the swap is confirmed" do
      before do
        # A real confirmed swap rather than a stub: `user.swap` is
        # `incoming_swap || outgoing_swap`, so being the chosen user is enough.
        create(:swap, chosen_user: user, confirmed: true)
        sign_in user
        allow(ENV).to receive(:[]).and_call_original
        allow(ENV).to receive(:[]).with("SWAPMYVOTE_MODE").and_return("open-and-voting")
      end

      it "403s: voting info is locked" do
        patch "/api/v1/user", params: { email: "locked@example.com" }, as: :json

        expect(response).to have_http_status(:forbidden)
        expect(json["error"]["code"]).to eq "voting_info_locked"
        expect(user.reload.email).to eq "voter@example.com"
      end
    end
  end
end
```

- [ ] **Step 2: Run the spec to verify it fails**

```bash
PATH="$HOME/.rbenv/shims:$PATH" bundle exec rspec spec/requests/api/v1/users_spec.rb
```

Expected: failures — no route matches `PATCH /api/v1/user`.

- [ ] **Step 3: Add the phase guard to the base controller**

In `app/controllers/api/v1/base_controller.rb`, add below `require_logged_in!`:

```ruby
      # Mirrors UsersController#restricted_when_voting_open: once voting is
      # open and this user's swap is confirmed, their voting information is
      # frozen. The legacy version redirects; this reports the refusal.
      def reject_when_voting_info_locked!
        return unless voting_info_locked?

        render_error(
          code: "voting_info_locked",
          status: :forbidden,
          messages: ["It's election day and your swap is confirmed, so your " \
                     "details are locked."]
        )
      end
```

`voting_info_locked?` is already available — `ApplicationController` defines it.

- [ ] **Step 4: Write the controller**

Create `app/controllers/api/v1/users_controller.rb`:

```ruby
module Api
  module V1
    # The logged-in user's own profile. Ports UsersController#update and
    # User::ConstituenciesController#update, which the React profile and
    # constituency screens both post to.
    #
    # Deliberately *not* gated on swapping being open: the legacy
    # UsersController gates only #show, so people can still fix their email
    # while swapping is closed.
    class UsersController < BaseController
      before_action :require_logged_in!
      before_action :reject_when_voting_info_locked!

      def update
        current_user.assign_attributes(user_params)

        # Read before saving, exactly where the legacy controller reads it:
        # ActiveModel's *_changed? predicates are only true pre-save.
        review_required = current_user.swap_profile_changed?

        errors = missing_field_errors
        return render_missing_fields(errors) if errors.any?

        unless current_user.save
          return render_error(
            code: "validation_failed",
            status: :unprocessable_entity,
            messages: current_user.errors.full_messages,
            fields: current_user.errors.to_hash(true)
          )
        end

        render json: {
          user: UserSerializer.new(current_user).to_h,
          reviewRequired: review_required
        }
      end

      private

      def user_params
        params.permit(:preferred_party_id, :willing_party_id,
                      :constituency_ons_id, :email, :consent_news_email)
      end

      # Wording copied from the legacy controllers so the two live sites say
      # the same thing. Unlike them, nothing is saved when a field is missing:
      # the legacy screens persist the change and then flash the complaint.
      def missing_field_errors
        messages = []
        if current_user.preferred_party_id.blank?
          messages << "You must state which party you would prefer to vote for."
        end
        if current_user.willing_party_id.blank?
          messages << "You must state which party you are willing to vote for."
        end
        if current_user.constituency_ons_id.blank?
          messages << "You must tell us your constituency. Without it, the " \
                      "swaps we offer may not make sense."
        end
        messages
      end

      def render_missing_fields(messages)
        current_user.reload
        render_error(
          code: "validation_failed",
          status: :unprocessable_entity,
          messages: messages
        )
      end
    end
  end
end
```

Note the guard order: `require_logged_in!` first, so a logged-out request gets 401 rather than the lock's 403.

- [ ] **Step 5: Add the route**

In `config/routes.rb`, inside `namespace :v1`, below the `resource :session` line:

```ruby
      # The logged-in user's own profile — the React profile and constituency
      # screens both patch this.
      resource :user, only: [:update], controller: "users"
```

- [ ] **Step 6: Run the spec to verify it passes**

```bash
PATH="$HOME/.rbenv/shims:$PATH" bundle exec rspec spec/requests/api/v1/users_spec.rb
```

Expected: all green. If the "leaves fields alone" example fails because the seeded user has no parties, check the `let(:user)` associations were created.

- [ ] **Step 7: Run the whole backend suite**

```bash
PATH="$HOME/.rbenv/shims:$PATH" bundle exec rspec
```

Expected: green — no legacy controller changed.

- [ ] **Step 8: Lint and commit**

```bash
PATH="$HOME/.rbenv/shims:$PATH" bundle exec rubocop app/controllers/api/v1 spec/requests/api/v1
git add app/controllers/api/v1 config/routes.rb spec/requests/api/v1/users_spec.rb
git commit -m "Add PATCH /api/v1/user for the React profile screens"
```

---

### Task 3: Frontend types and data layer

**Files:**
- Modify: `app/frontend/types/api.ts`
- Create: `app/frontend/lib/profile.ts`
- Test: `app/frontend/lib/profile.test.tsx`

**Interfaces:**
- Consumes: the two endpoints from Tasks 1 and 2; `apiClient` from `@/lib/apiClient`.
- Produces:
  - `ConstituencyPoll`, `ConstituencyDetail`, `ProfileUpdate`, `ProfileUpdateResult` in `@/types/api`
  - `updateProfile(update: ProfileUpdate): Promise<ProfileUpdateResult>`
  - `useConstituencyDetail(onsId: string | null): UseQueryResult<ConstituencyDetail>`

- [ ] **Step 1: Add the types**

Append to `app/frontend/types/api.ts`:

```ts
/** One party's predicted result in a constituency. Numbers are as stored:
 *  `votes` and both marginal scores are hundredths of a percent, so a chart
 *  divides by 100 to show a percentage. */
export interface ConstituencyPoll {
  partyId: number;
  partyName: string | null;
  /** Abbreviation the chart labels bars with, e.g. "Lab". */
  partyShortName: string;
  color: string | null;
  votes: number;
  /** Absolute gap to the best of the other parties. Null until the marginal
   *  score rake task has run over this constituency. */
  marginalScore: number | null;
  /** Signed gap: positive when this party leads. */
  signedMarginalScore: number;
}

/** `GET /api/v1/constituencies/:ons_id` — a constituency and the polls the
 *  review screen charts. Parties with no predicted votes are already gone. */
export interface ConstituencyDetail extends Constituency {
  polls: ConstituencyPoll[];
}

/** `PATCH /api/v1/user`. Every field is optional: what is not sent is left
 *  alone, so the constituency screen can post a subset. */
export interface ProfileUpdate {
  preferredPartyId?: string;
  willingPartyId?: string;
  constituencyOnsId?: string;
  email?: string;
}

export interface ProfileUpdateResult {
  user: CurrentUser;
  /** The willing party or the constituency changed, so the user is sent to
   *  the review screen — mirrors User#swap_profile_changed?. */
  reviewRequired: boolean;
}
```

- [ ] **Step 2: Write the failing tests**

Create `app/frontend/lib/profile.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/lib/apiClient";
import { updateProfile, useConstituencyDetail } from "@/lib/profile";
import type { ConstituencyDetail } from "@/types/api";

vi.mock("@/lib/apiClient", () => ({
  apiClient: { get: vi.fn(), patch: vi.fn() },
}));

const detail: ConstituencyDetail = {
  onsId: "E14001063",
  name: "Woking",
  polls: [],
};

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("updateProfile", () => {
  beforeEach(() => {
    vi.mocked(apiClient.patch).mockReset();
  });

  it("sends the fields the API names, in snake_case", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      user: null,
      reviewRequired: false,
    });

    await updateProfile({
      preferredPartyId: "1",
      willingPartyId: "2",
      constituencyOnsId: "E14001063",
      email: "voter@example.com",
    });

    expect(apiClient.patch).toHaveBeenCalledWith("/user", {
      preferred_party_id: "1",
      willing_party_id: "2",
      constituency_ons_id: "E14001063",
      email: "voter@example.com",
    });
  });

  it("omits fields the caller left out rather than sending undefined", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      user: null,
      reviewRequired: false,
    });

    await updateProfile({ constituencyOnsId: "E14001063" });

    expect(apiClient.patch).toHaveBeenCalledWith("/user", {
      constituency_ons_id: "E14001063",
    });
  });
});

describe("useConstituencyDetail", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
  });

  it("fetches the constituency by ONS id", async () => {
    vi.mocked(apiClient.get).mockResolvedValue(detail);

    const { result } = renderHook(() => useConstituencyDetail("E14001063"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.data).toEqual(detail));
    expect(apiClient.get).toHaveBeenCalledWith("/constituencies/E14001063");
  });

  it("does not fetch until there is an ONS id", () => {
    renderHook(() => useConstituencyDetail(null), { wrapper });

    expect(apiClient.get).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

```bash
corepack yarn test app/frontend/lib/profile.test.tsx
```

Expected: FAIL — cannot resolve `@/lib/profile`.

- [ ] **Step 4: Write the data layer**

Create `app/frontend/lib/profile.ts`:

```ts
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type {
  ConstituencyDetail,
  ProfileUpdate,
  ProfileUpdateResult,
} from "@/types/api";

/**
 * Save the logged-in user's profile. Only the fields passed are sent, so the
 * constituency screen can post its two without clearing the parties.
 *
 * The API keys are snake_case (Rails strong parameters); the camelCase names
 * stop at this boundary.
 */
export function updateProfile(
  update: ProfileUpdate,
): Promise<ProfileUpdateResult> {
  const body: Record<string, string> = {};
  if (update.preferredPartyId !== undefined) {
    body.preferred_party_id = update.preferredPartyId;
  }
  if (update.willingPartyId !== undefined) {
    body.willing_party_id = update.willingPartyId;
  }
  if (update.constituencyOnsId !== undefined) {
    body.constituency_ons_id = update.constituencyOnsId;
  }
  if (update.email !== undefined) {
    body.email = update.email;
  }
  return apiClient.patch<ProfileUpdateResult>("/user", body);
}

/**
 * One constituency and its polls, for the review screen's chart. Polling
 * numbers are re-seeded between elections, never mid-session, so this opts out
 * of refetching the same way the other reference data does.
 */
export function useConstituencyDetail(
  onsId: string | null,
): UseQueryResult<ConstituencyDetail> {
  return useQuery({
    queryKey: ["constituency", onsId],
    queryFn: () => apiClient.get<ConstituencyDetail>(`/constituencies/${onsId}`),
    enabled: onsId !== null && onsId !== "",
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
  });
}
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
corepack yarn test app/frontend/lib/profile.test.tsx
```

Expected: PASS, 4 tests.

- [ ] **Step 6: Gates and commit**

```bash
corepack yarn lint:fix && corepack yarn typecheck && corepack yarn test
git add app/frontend/types/api.ts app/frontend/lib/profile.ts app/frontend/lib/profile.test.tsx
git commit -m "Add the profile update and constituency detail data layer"
```

---

### Task 4: Poll interpretation

**Files:**
- Create: `app/frontend/lib/pollInterpretation.ts`
- Test: `app/frontend/lib/pollInterpretation.test.ts`

**Interfaces:**
- Consumes: `ConstituencyPoll` from `@/types/api`.
- Produces: `interpretPoll(poll: ConstituencyPoll | null | undefined): PollInterpretation | null` and the exported `PollInterpretation` type:

```ts
interface PollInterpretation {
  kind: "could-make-a-difference" | "safe-win" | "trailing";
  /** Already formatted, e.g. "9%" or "0.4%". */
  percent: string;
  /** Only meaningful for "could-make-a-difference". */
  leading: boolean;
}
```

- [ ] **Step 1: Write the failing tests**

Create `app/frontend/lib/pollInterpretation.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { interpretPoll } from "@/lib/pollInterpretation";
import type { ConstituencyPoll } from "@/types/api";

function poll(overrides: Partial<ConstituencyPoll>): ConstituencyPoll {
  return {
    partyId: 1,
    partyName: "Labour",
    partyShortName: "Lab",
    color: "#DC241f",
    votes: 4210,
    marginalScore: 500,
    signedMarginalScore: 500,
    ...overrides,
  };
}

describe("interpretPoll", () => {
  it("calls a sub-1000 marginal score a vote that could make a difference", () => {
    expect(interpretPoll(poll({ marginalScore: 500, signedMarginalScore: 500 })))
      .toEqual({ kind: "could-make-a-difference", percent: "5%", leading: true });
  });

  it("marks a close trailing party as trailing the leader, still winnable", () => {
    expect(
      interpretPoll(poll({ marginalScore: 500, signedMarginalScore: -500 })),
    ).toEqual({
      kind: "could-make-a-difference",
      percent: "5%",
      leading: false,
    });
  });

  it("calls a big lead a safe win", () => {
    expect(
      interpretPoll(poll({ marginalScore: 2400, signedMarginalScore: 2400 })),
    ).toEqual({ kind: "safe-win", percent: "24%", leading: true });
  });

  it("calls a big deficit trailing", () => {
    expect(
      interpretPoll(poll({ marginalScore: 2400, signedMarginalScore: -2400 })),
    ).toEqual({ kind: "trailing", percent: "24%", leading: false });
  });

  it("formats scores under 9% to one significant figure, as the HAML did", () => {
    expect(
      interpretPoll(poll({ marginalScore: 42, signedMarginalScore: 42 }))?.percent,
    ).toBe("0.4%");
  });

  it("formats scores of 9% and over as whole numbers", () => {
    expect(
      interpretPoll(poll({ marginalScore: 900, signedMarginalScore: 900 }))
        ?.percent,
    ).toBe("9%");
    expect(
      interpretPoll(poll({ marginalScore: 1234, signedMarginalScore: 1234 }))
        ?.percent,
    ).toBe("12%");
  });

  it("has nothing to say without a poll", () => {
    expect(interpretPoll(null)).toBeNull();
    expect(interpretPoll(undefined)).toBeNull();
  });

  it("has nothing to say before marginal scores have been calculated", () => {
    expect(interpretPoll(poll({ marginalScore: null }))).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
corepack yarn test app/frontend/lib/pollInterpretation.test.ts
```

Expected: FAIL — cannot resolve `@/lib/pollInterpretation`.

- [ ] **Step 3: Write the implementation**

Create `app/frontend/lib/pollInterpretation.ts`:

```ts
import type { ConstituencyPoll } from "@/types/api";

export interface PollInterpretation {
  kind: "could-make-a-difference" | "safe-win" | "trailing";
  /** Already formatted, e.g. "9%" or "0.4%". */
  percent: string;
  /** Only meaningful for "could-make-a-difference": whether the party is the
   *  one in front. */
  leading: boolean;
}

// Below this gap the seat is a marginal, and one vote is worth swapping for.
// Same threshold as _polls_interpretation_self.html.haml.
const marginalThreshold = 1000;

/**
 * Ports the percentage formatting in
 * app/views/user/swaps/_polls_interpretation_self.html.haml: whole numbers at
 * 9% and above, one significant figure below it.
 *
 * Ruby's "%.1g" rounds half to even and JavaScript's toPrecision rounds half
 * away from zero, so an exact half (8.5%) differs by a rounding step. Polling
 * numbers are estimates to begin with, so that is not worth emulating.
 */
function formatPercent(marginalScore: number): string {
  const percent = marginalScore / 100;
  if (percent >= 9) {
    return `${Math.round(percent)}%`;
  }
  return `${Number(percent.toPrecision(1))}%`;
}

/**
 * How the user's willing party is doing in their constituency, as the review
 * screen explains it. Returns null when there is nothing to say — no poll for
 * that party, or marginal scores not yet calculated — and the caller shows the
 * legacy "no polling data found" line instead.
 */
export function interpretPoll(
  poll: ConstituencyPoll | null | undefined,
): PollInterpretation | null {
  if (!poll || poll.marginalScore === null) {
    return null;
  }

  const percent = formatPercent(poll.marginalScore);
  const leading = poll.signedMarginalScore > 0;

  if (poll.marginalScore < marginalThreshold) {
    return { kind: "could-make-a-difference", percent, leading };
  }
  if (leading) {
    return { kind: "safe-win", percent, leading };
  }
  return { kind: "trailing", percent, leading: false };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
corepack yarn test app/frontend/lib/pollInterpretation.test.ts
```

Expected: PASS, 8 tests.

- [ ] **Step 5: Gates and commit**

```bash
corepack yarn lint:fix && corepack yarn typecheck && corepack yarn test
git add app/frontend/lib/pollInterpretation.ts app/frontend/lib/pollInterpretation.test.ts
git commit -m "Port the poll interpretation copy rules to a pure function"
```

---

### Task 5: Poll chart

**Files:**
- Modify: `package.json`
- Create: `app/frontend/components/polls/pollChartConfig.ts`
- Create: `app/frontend/components/polls/PollChart.tsx`
- Test: `app/frontend/components/polls/pollChartConfig.test.ts`, `app/frontend/components/polls/PollChart.test.tsx`

**Interfaces:**
- Consumes: `ConstituencyPoll` from `@/types/api`.
- Produces: `buildPollChartConfig(polls: ConstituencyPoll[]): { data: ChartData<"bar">; options: ChartOptions<"bar"> }` and `<PollChart polls={…} constituencyName={…} />`.

- [ ] **Step 1: Add the chart dependencies**

```bash
corepack yarn add chart.js@^4.5.1 react-chartjs-2@^5.3.1
```

Same majors as tacticalvote, so a chart can be lifted between the two apps later. No adapter or plugin packages yet — the first chart that needs `chartjs-plugin-annotation` or the luxon adapter adds them.

- [ ] **Step 2: Write the failing config test**

Create `app/frontend/components/polls/pollChartConfig.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildPollChartConfig } from "@/components/polls/pollChartConfig";
import type { ConstituencyPoll } from "@/types/api";

const polls: ConstituencyPoll[] = [
  {
    partyId: 1,
    partyName: "Labour",
    partyShortName: "Lab",
    color: "#DC241f",
    votes: 4210,
    marginalScore: 3010,
    signedMarginalScore: 3010,
  },
  {
    partyId: 2,
    partyName: "Green",
    partyShortName: "Grn",
    color: null,
    votes: 1200,
    marginalScore: 3010,
    signedMarginalScore: -3010,
  },
];

describe("buildPollChartConfig", () => {
  it("labels bars with the party short name", () => {
    const { data } = buildPollChartConfig(polls);

    expect(data.labels).toEqual(["Lab", "Grn"]);
  });

  it("plots percentages, not the stored hundredths", () => {
    const { data } = buildPollChartConfig(polls);

    expect(data.datasets[0].data).toEqual([42.1, 12]);
  });

  it("colours each bar with its party colour", () => {
    const { data } = buildPollChartConfig(polls);

    expect(data.datasets[0].backgroundColor).toEqual(["#DC241f", "#6c757d"]);
  });

  it("hides the legend and the y axis, as the legacy chart did", () => {
    const { options } = buildPollChartConfig(polls);

    expect(options.plugins?.legend?.display).toBe(false);
    expect(options.scales?.y?.display).toBe(false);
  });

  it("survives a constituency with no polls", () => {
    const { data } = buildPollChartConfig([]);

    expect(data.labels).toEqual([]);
    expect(data.datasets[0].data).toEqual([]);
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

```bash
corepack yarn test app/frontend/components/polls/pollChartConfig.test.ts
```

Expected: FAIL — cannot resolve `@/components/polls/pollChartConfig`.

- [ ] **Step 4: Write the config builder**

Create `app/frontend/components/polls/pollChartConfig.ts`:

```ts
import type { ChartData, ChartOptions } from "chart.js";
import type { ConstituencyPoll } from "@/types/api";

// Parties whose colour we do not hold get Bootstrap's secondary grey rather
// than Chart.js's default blue, which reads as a party colour.
const unknownPartyColor = "#6c757d";

/**
 * Turns polls into the bar chart the review screen draws.
 *
 * Kept pure and separate from the canvas component for two reasons: it is the
 * part worth unit testing, and the next chart we add (tacticalvote has richer
 * ones) is a second builder rather than a fork of a component.
 *
 * Ports the options from app/assets/javascripts/polls.coffee: no legend, no
 * y-axis, percentages annotated on the bars, and party colours per bar.
 */
export function buildPollChartConfig(polls: ConstituencyPoll[]): {
  data: ChartData<"bar">;
  options: ChartOptions<"bar">;
} {
  const data: ChartData<"bar"> = {
    labels: polls.map((poll) => poll.partyShortName),
    datasets: [
      {
        // Votes are stored as hundredths of a percent (PollsHelper divides by
        // 100 for the same chart).
        data: polls.map((poll) => poll.votes / 100),
        backgroundColor: polls.map((poll) => poll.color ?? unknownPartyColor),
        borderWidth: 0,
      },
    ],
  };

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (item) => `${Math.round(Number(item.parsed.y))}%`,
        },
      },
    },
    scales: {
      x: { grid: { display: false } },
      // The bars are annotated with their own values by the tooltip, and the
      // legacy chart showed no vertical scale either.
      y: { display: false, beginAtZero: true },
    },
  };

  return { data, options };
}
```

- [ ] **Step 5: Run the config test to verify it passes**

```bash
corepack yarn test app/frontend/components/polls/pollChartConfig.test.ts
```

Expected: PASS, 5 tests.

- [ ] **Step 6: Write the failing component test**

Create `app/frontend/components/polls/PollChart.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PollChart } from "@/components/polls/PollChart";
import type { ConstituencyPoll } from "@/types/api";

// jsdom has no canvas, so the chart itself is stubbed: what matters here is
// that the right data reaches it and the figure is labelled. The config is
// covered by pollChartConfig.test.ts.
vi.mock("react-chartjs-2", () => ({
  Chart: ({ "aria-label": ariaLabel }: { "aria-label"?: string }) => (
    <div data-testid="chart" aria-label={ariaLabel} />
  ),
}));

const polls: ConstituencyPoll[] = [
  {
    partyId: 1,
    partyName: "Labour",
    partyShortName: "Lab",
    color: "#DC241f",
    votes: 4210,
    marginalScore: 3010,
    signedMarginalScore: 3010,
  },
];

describe("PollChart", () => {
  it("names the constituency it is charting", () => {
    render(<PollChart polls={polls} constituencyName="Woking" />);

    expect(screen.getByTestId("chart")).toHaveAttribute(
      "aria-label",
      expect.stringContaining("Woking"),
    );
  });

  it("lists the numbers in a table for anyone the canvas fails", () => {
    render(<PollChart polls={polls} constituencyName="Woking" />);

    expect(screen.getByRole("row", { name: /labour/i })).toHaveTextContent(
      "42%",
    );
  });
});
```

- [ ] **Step 7: Run it to verify it fails**

```bash
corepack yarn test app/frontend/components/polls/PollChart.test.tsx
```

Expected: FAIL — cannot resolve `@/components/polls/PollChart`.

- [ ] **Step 8: Write the chart component**

Create `app/frontend/components/polls/PollChart.tsx`:

```tsx
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  Tooltip,
} from "chart.js";
import { Chart } from "react-chartjs-2";
import { buildPollChartConfig } from "@/components/polls/pollChartConfig";
import type { ConstituencyPoll } from "@/types/api";
import styles from "./PollChart.module.scss";

// Registered here rather than globally: a chart pays only for the pieces it
// draws with, so a later chart can pull in an annotation plugin or a time
// scale without this one loading them.
ChartJS.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

interface PollChartProps {
  polls: ConstituencyPoll[];
  constituencyName: string;
}

/**
 * Predicted vote share by party, replacing the Google Charts column chart in
 * app/assets/javascripts/polls.coffee — and with it the third-party script the
 * legacy page loads.
 *
 * A <canvas> is invisible to a screen reader, so the same numbers follow it as
 * a visually hidden table. That is the accessible copy; the chart is labelled
 * and otherwise left out of the accessibility tree.
 */
export function PollChart({ polls, constituencyName }: PollChartProps) {
  const { data, options } = buildPollChartConfig(polls);

  return (
    <figure className="mb-0">
      <div className={styles.chart}>
        <Chart
          type="bar"
          data={data}
          options={options}
          aria-label={`Predicted vote share by party in ${constituencyName}`}
        />
      </div>

      <table className="visually-hidden">
        <caption>Predicted vote share in {constituencyName}</caption>
        <thead>
          <tr>
            <th scope="col">Party</th>
            <th scope="col">Predicted vote share</th>
          </tr>
        </thead>
        <tbody>
          {polls.map((poll) => (
            <tr key={poll.partyId}>
              <th scope="row">{poll.partyName}</th>
              <td>{Math.round(poll.votes / 100)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
```

- [ ] **Step 9: Add the chart's stylesheet**

Create `app/frontend/components/polls/PollChart.module.scss`:

```scss
// Chart.js sizes its canvas to the parent, so the parent needs a height —
// `maintainAspectRatio: false` means it will not invent one.
.chart {
  position: relative;
  height: 220px;
}
```

- [ ] **Step 10: Run the component test to verify it passes**

```bash
corepack yarn test app/frontend/components/polls
```

Expected: PASS, 7 tests across both files.

- [ ] **Step 11: Gates and commit**

```bash
corepack yarn lint:fix && corepack yarn typecheck && corepack yarn test
git add package.json yarn.lock app/frontend/components/polls
git commit -m "Add the Chart.js poll chart and its config builder"
```

---

### Task 6: Constituency screen

**Files:**
- Create: `app/frontend/components/auth/RequireLogin.tsx`
- Create: `app/frontend/components/profile/ConstituencyForm.tsx`
- Create: `app/frontend/pages/Constituency.tsx`
- Modify: `app/frontend/lib/spaPaths.ts`, `app/frontend/app/App.tsx`, `config/routes.rb`
- Test: `app/frontend/components/auth/RequireLogin.test.tsx`, `app/frontend/components/profile/ConstituencyForm.test.tsx`

**Interfaces:**
- Consumes: `useSession`, `useConstituencies`, `updateProfile`, `ConstituencyAutocomplete`, `PostcodeLookup`.
- Produces:
  - `<RequireLogin>{children}</RequireLogin>` — renders children only when `session.currentUser` is set; otherwise a sign-in prompt.
  - `<ConstituencyForm constituencies={…} initialOnsId={…} needsEmail={…} initialEmail={…} onSaved={() => void} />`
  - `spaPaths.constituency === "/app/constituency"`

- [ ] **Step 1: Write the failing RequireLogin test**

Create `app/frontend/components/auth/RequireLogin.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RequireLogin } from "@/components/auth/RequireLogin";
import {
  SessionContext,
  type SessionContextValue,
} from "@/contexts/SessionContext";
import type { CurrentUser, SessionPayload } from "@/types/api";

const user: CurrentUser = {
  id: 1,
  name: "John",
  email: "john@example.com",
  imageUrl: "/john.png",
  hasConstituency: true,
  constituencyName: "Woking",
  constituencyOnsId: "E14001063",
  mobileVerified: true,
  mobileSetButNotVerified: false,
  preferredParty: null,
  willingParty: null,
};

function renderWithSession(session: SessionPayload | null, isLoading = false) {
  const value: SessionContextValue = {
    session,
    isLoading,
    isError: false,
    refetchSession: async () => undefined,
    logOut: async () => {
      throw new Error("not used");
    },
  };
  render(
    <SessionContext.Provider value={value}>
      <RequireLogin>
        <p>Secret</p>
      </RequireLogin>
    </SessionContext.Provider>,
  );
}

const loggedOut: SessionPayload = {
  appMode: "open",
  flags: {
    loginsOpen: true,
    swappingOpen: true,
    votingOpen: false,
    votingInfoLocked: false,
  },
  currentUser: null,
  swap: null,
};

describe("RequireLogin", () => {
  it("shows the children to a logged-in user", () => {
    renderWithSession({ ...loggedOut, currentUser: user });

    expect(screen.getByText("Secret")).toBeInTheDocument();
  });

  it("sends a logged-out visitor to log in, leaving the SPA", () => {
    renderWithSession(loggedOut);

    expect(screen.queryByText("Secret")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /log in/i })).toHaveAttribute(
      "href",
      "/users/sign_in",
    );
  });

  it("says nothing while the session is still loading", () => {
    renderWithSession(null, true);

    expect(screen.queryByText("Secret")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /log in/i })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
corepack yarn test app/frontend/components/auth/RequireLogin.test.tsx
```

Expected: FAIL — cannot resolve `@/components/auth/RequireLogin`.

- [ ] **Step 3: Write RequireLogin**

Create `app/frontend/components/auth/RequireLogin.tsx`:

```tsx
import type { ReactNode } from "react";
import Alert from "react-bootstrap/Alert";
import Container from "react-bootstrap/Container";
import Spinner from "react-bootstrap/Spinner";
import { useSession } from "@/contexts/useSession";

// Devise's sign-in page is still HAML, so this is a full-page link out of the
// SPA rather than a react-router route. It becomes an in-app route in M5.
const hamlSignIn = "/users/sign_in";

/**
 * Shows its children only to a logged-in user. UX only: every endpoint behind
 * these screens re-checks authentication itself, so a client that skipped this
 * would gain nothing.
 */
export function RequireLogin({ children }: { children: ReactNode }) {
  const { session, isLoading } = useSession();

  if (isLoading || !session) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading</span>
        </Spinner>
      </Container>
    );
  }

  if (!session.currentUser) {
    return (
      <Container className="container-narrow py-5">
        <Alert variant="warning">
          <p>You need to be logged in to see this page</p>
          <Alert.Link href={hamlSignIn}>Log in</Alert.Link>
        </Alert>
      </Container>
    );
  }

  return <>{children}</>;
}
```

- [ ] **Step 4: Run it to verify it passes**

```bash
corepack yarn test app/frontend/components/auth/RequireLogin.test.tsx
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Write the failing ConstituencyForm test**

Create `app/frontend/components/profile/ConstituencyForm.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConstituencyForm } from "@/components/profile/ConstituencyForm";
import { updateProfile } from "@/lib/profile";
import type { Constituency } from "@/types/api";

vi.mock("@/lib/profile", () => ({ updateProfile: vi.fn() }));

const constituencies: Constituency[] = [
  { onsId: "E14001063", name: "Woking" },
  { onsId: "E14001009", name: "Wakefield" },
];

function renderForm(props: Partial<Parameters<typeof ConstituencyForm>[0]> = {}) {
  const onSaved = vi.fn();
  render(
    <ConstituencyForm
      constituencies={constituencies}
      initialOnsId=""
      needsEmail={false}
      initialEmail=""
      onSaved={onSaved}
      {...props}
    />,
  );
  return { onSaved };
}

describe("ConstituencyForm", () => {
  beforeEach(() => {
    vi.mocked(updateProfile).mockReset();
    vi.mocked(updateProfile).mockResolvedValue({
      user: null as never,
      reviewRequired: false,
    });
  });

  it("saves the chosen constituency", async () => {
    const { onSaved } = renderForm({ initialOnsId: "E14001063" });

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(updateProfile).toHaveBeenCalledWith({
        constituencyOnsId: "E14001063",
      }),
    );
    expect(onSaved).toHaveBeenCalled();
  });

  it("refuses to save without a constituency, in the legacy wording", async () => {
    renderForm();

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(
      await screen.findByText(/you must tell us your constituency/i),
    ).toBeInTheDocument();
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it("asks for an email only when we do not have one", async () => {
    renderForm({ needsEmail: true, initialOnsId: "E14001063" });

    const email = screen.getByLabelText(/email address/i);
    await userEvent.type(email, "voter@example.com");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(updateProfile).toHaveBeenCalledWith({
        constituencyOnsId: "E14001063",
        email: "voter@example.com",
      }),
    );
  });

  it("does not ask for an email when we already have one", () => {
    renderForm({ needsEmail: false });

    expect(screen.queryByLabelText(/email address/i)).not.toBeInTheDocument();
  });

  it("reports what the server refused", async () => {
    vi.mocked(updateProfile).mockRejectedValue(
      Object.assign(new Error("nope"), {
        name: "ApiError",
        messages: ["Email is invalid"],
      }),
    );
    renderForm({ initialOnsId: "E14001063" });

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByText("Email is invalid")).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

```bash
corepack yarn test app/frontend/components/profile/ConstituencyForm.test.tsx
```

Expected: FAIL — cannot resolve `@/components/profile/ConstituencyForm`.

- [ ] **Step 7: Write ConstituencyForm**

Create `app/frontend/components/profile/ConstituencyForm.tsx`:

```tsx
import { type FormEvent, useId, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import { ConstituencyAutocomplete } from "@/components/home/ConstituencyAutocomplete";
import { PostcodeLookup } from "@/components/home/PostcodeLookup";
import { ApiError } from "@/lib/apiClient";
import { updateProfile } from "@/lib/profile";
import type { Constituency } from "@/types/api";

interface ConstituencyFormProps {
  constituencies: Constituency[];
  initialOnsId: string;
  /** The legacy screen asks for an email only when the account has none. */
  needsEmail: boolean;
  initialEmail: string;
  onSaved: () => void;
}

const constituencyRequired =
  "You must tell us your constituency. Without it, the swaps we offer may not make sense.";

/**
 * Where a new account says which constituency it votes in. Ports
 * app/views/user/constituencies/edit.html.haml, including its two ways of
 * answering (name or postcode) and the email field it shows only when the
 * account arrived without one — which OmniAuth sign-ups can.
 */
export function ConstituencyForm({
  constituencies,
  initialOnsId,
  needsEmail,
  initialEmail,
  onSaved,
}: ConstituencyFormProps) {
  const emailId = useId();
  const [onsId, setOnsId] = useState(initialOnsId);
  const [postcode, setPostcode] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function handleConstituencyPicked(picked: string) {
    setOnsId(picked);
    if (picked !== "") {
      // Same exclusivity the legacy widget kept: choosing a name clears the
      // postcode, so a stale one cannot look like the source of the answer.
      setPostcode("");
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (onsId === "") {
      setErrors([constituencyRequired]);
      return;
    }

    setSaving(true);
    setErrors([]);
    try {
      await updateProfile({
        constituencyOnsId: onsId,
        ...(needsEmail ? { email } : {}),
      });
      onSaved();
    } catch (error) {
      const messages =
        error instanceof ApiError && error.messages.length > 0
          ? error.messages
          : ["Something went wrong - please try that again."];
      setErrors(messages);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="d-flex flex-column gap-3">
        <ConstituencyAutocomplete
          constituencies={constituencies}
          value={onsId}
          onChange={handleConstituencyPicked}
        />

        <PostcodeLookup
          constituencies={constituencies}
          postcode={postcode}
          onPostcodeChange={setPostcode}
          onConstituencyFound={setOnsId}
        />

        {needsEmail && (
          <Form.Group controlId={emailId}>
            <Form.Label>My email address is</Form.Label>
            <Form.Control
              type="email"
              placeholder="me@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <Form.Text className="subdued">
              We need your email address so we can tell you about your swap.
              Your details will stay private with us.
            </Form.Text>
          </Form.Group>
        )}

        {errors.length > 0 && (
          <Alert variant="danger" className="small mb-0" role="alert">
            {errors.map((message) => (
              <p key={message} className="mb-0">
                {message}
              </p>
            ))}
          </Alert>
        )}

        <div className="d-flex justify-content-end">
          <Button type="submit" variant="primary" disabled={saving}>
            Save
          </Button>
        </div>
      </div>
    </form>
  );
}
```

- [ ] **Step 8: Run it to verify it passes**

```bash
corepack yarn test app/frontend/components/profile/ConstituencyForm.test.tsx
```

Expected: PASS, 5 tests. The "reports what the server refused" case relies on the thrown object being an `ApiError`; if it fails, change the mock rejection to `new ApiError(422, { error: { code: "validation_failed", messages: ["Email is invalid"], fields: {} } })` and import `ApiError` in the test.

- [ ] **Step 9: Write the page**

Create `app/frontend/pages/Constituency.tsx`:

```tsx
import Card from "react-bootstrap/Card";
import Container from "react-bootstrap/Container";
import Spinner from "react-bootstrap/Spinner";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { ConstituencyForm } from "@/components/profile/ConstituencyForm";
import { useSession } from "@/contexts/useSession";
import { useConstituencies } from "@/lib/referenceData";

// Where the legacy controller sends people once their constituency is saved.
// Still HAML until M7, so this is a full page load.
const hamlSwap = "/user/swap";

/**
 * Ports app/views/user/constituencies/edit.html.haml — the screen a new
 * account lands on when it has no constituency yet.
 */
export function Constituency() {
  const { session, refetchSession } = useSession();
  const constituencies = useConstituencies();

  async function handleSaved() {
    await refetchSession();
    window.location.assign(hamlSwap);
  }

  return (
    <RequireLogin>
      <Container className="container-narrow py-4">
        <Card>
          <Card.Header>
            <h1 className="h4 mb-0">Where do you vote?</h1>
          </Card.Header>
          <Card.Body>
            {constituencies.isPending ? (
              <div className="text-center">
                <Spinner animation="border" role="status">
                  <span className="visually-hidden">Loading</span>
                </Spinner>
              </div>
            ) : (
              <ConstituencyForm
                constituencies={constituencies.data ?? []}
                initialOnsId={session?.currentUser?.constituencyOnsId ?? ""}
                needsEmail={!session?.currentUser?.email}
                initialEmail={session?.currentUser?.email ?? ""}
                onSaved={handleSaved}
              />
            )}
          </Card.Body>
        </Card>
      </Container>
    </RequireLogin>
  );
}
```

- [ ] **Step 10: Route it — all three places**

In `app/frontend/lib/spaPaths.ts`, add to the `spaPaths` object:

```ts
  constituency: "/app/constituency",
```

In `app/frontend/app/App.tsx`, add the import and the route:

```tsx
import { Constituency } from "@/pages/Constituency";
```

```tsx
                  <Route
                    path={spaPaths.constituency}
                    element={<Constituency />}
                  />
```

In `config/routes.rb`, below the `get "app/home"` line:

```ruby
  # M4 profile screens. /user, /user/constituency and /user/review keep
  # serving HAML until cutover.
  get "app/constituency", to: "spa#index"
```

- [ ] **Step 11: Verify in the browser**

Start the stack, sign in through the legacy page, then load the preview path:

```bash
foreman start -f Procfile.dev
```

Visit `http://localhost:3000/users/sign_in`, log in, then `http://localhost:3000/app/constituency`. Choose a constituency, save, and confirm the browser lands on `/user/swap` with the constituency set.

- [ ] **Step 12: Gates and commit**

```bash
corepack yarn lint:fix && corepack yarn typecheck && corepack yarn test
git add app/frontend/components/auth app/frontend/components/profile/ConstituencyForm.tsx app/frontend/components/profile/ConstituencyForm.test.tsx app/frontend/pages/Constituency.tsx app/frontend/lib/spaPaths.ts app/frontend/app/App.tsx config/routes.rb
git commit -m "Port the constituency screen to React behind /app/constituency"
```

---

### Task 7: Profile edit screen

**Files:**
- Create: `app/frontend/components/profile/ProfileForm.tsx`
- Create: `app/frontend/pages/Profile.tsx`
- Modify: `app/frontend/lib/spaPaths.ts`, `app/frontend/app/App.tsx`, `config/routes.rb`
- Test: `app/frontend/components/profile/ProfileForm.test.tsx`

**Interfaces:**
- Consumes: `updateProfile`, `RequireLogin`, `ConstituencyAutocomplete`, `PostcodeLookup`, `useParties`, `useConstituencies`, `useSession`.
- Produces: `<ProfileForm parties={…} constituencies={…} user={…} locked={…} onSaved={(result: ProfileUpdateResult) => void} />` and `spaPaths.profile === "/app/profile"`.

- [ ] **Step 1: Write the failing test**

Create `app/frontend/components/profile/ProfileForm.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { updateProfile } from "@/lib/profile";
import type { Constituency, CurrentUser, Party } from "@/types/api";

vi.mock("@/lib/profile", () => ({ updateProfile: vi.fn() }));

const parties: Party[] = [
  { id: 1, name: "Green", color: "#6AB023", smvCode: "grn" },
  { id: 2, name: "Labour", color: "#DC241f", smvCode: "lab" },
];

const constituencies: Constituency[] = [
  { onsId: "E14001063", name: "Woking" },
  { onsId: "E14001009", name: "Wakefield" },
];

const user: CurrentUser = {
  id: 1,
  name: "John",
  email: "john@example.com",
  imageUrl: "/john.png",
  hasConstituency: true,
  constituencyName: "Woking",
  constituencyOnsId: "E14001063",
  mobileVerified: false,
  mobileSetButNotVerified: true,
  preferredParty: parties[0],
  willingParty: parties[1],
};

function renderForm(overrides: { user?: CurrentUser; locked?: boolean } = {}) {
  const onSaved = vi.fn();
  render(
    <ProfileForm
      parties={parties}
      constituencies={constituencies}
      user={overrides.user ?? user}
      locked={overrides.locked ?? false}
      onSaved={onSaved}
    />,
  );
  return { onSaved };
}

describe("ProfileForm", () => {
  beforeEach(() => {
    vi.mocked(updateProfile).mockReset();
    vi.mocked(updateProfile).mockResolvedValue({
      user,
      reviewRequired: false,
    });
  });

  it("starts from what we already know about the user", () => {
    renderForm();

    expect(screen.getByLabelText(/preferred party/i)).toHaveValue("1");
    expect(screen.getByLabelText(/willing to vote for/i)).toHaveValue("2");
    expect(screen.getByLabelText(/email address/i)).toHaveValue(
      "john@example.com",
    );
  });

  it("saves every field, and hands the result back", async () => {
    const { onSaved } = renderForm();

    await userEvent.selectOptions(screen.getByLabelText(/preferred party/i), "2");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(updateProfile).toHaveBeenCalledWith({
        preferredPartyId: "2",
        willingPartyId: "2",
        constituencyOnsId: "E14001063",
        email: "john@example.com",
      }),
    );
    expect(onSaved).toHaveBeenCalledWith({ user, reviewRequired: false });
  });

  it("warns that changing the profile undoes an agreed swap", () => {
    renderForm();

    expect(
      screen.getByText(/will undo any swap that you have agreed to/i),
    ).toBeInTheDocument();
  });

  it("locks the swap fields on election day once the swap is confirmed", () => {
    renderForm({ locked: true });

    expect(screen.getByLabelText(/preferred party/i)).toBeDisabled();
    expect(screen.getByLabelText(/willing to vote for/i)).toBeDisabled();
    expect(screen.getByText(/currently locked/i)).toBeInTheDocument();
  });

  it("links out to the legacy mobile page, reporting what we have", () => {
    renderForm();

    expect(screen.getByText(/not verified/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /verify your mobile/i }),
    ).toHaveAttribute("href", "/user/edit");
  });

  it("links out to account deletion", () => {
    renderForm();

    expect(
      screen.getByRole("link", { name: /delete your account/i }),
    ).toHaveAttribute("href", "/confirm_account_deletion");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
corepack yarn test app/frontend/components/profile/ProfileForm.test.tsx
```

Expected: FAIL — cannot resolve `@/components/profile/ProfileForm`.

- [ ] **Step 3: Write ProfileForm**

Create `app/frontend/components/profile/ProfileForm.tsx`:

```tsx
import { type FormEvent, useId, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import { ConstituencyAutocomplete } from "@/components/home/ConstituencyAutocomplete";
import { PostcodeLookup } from "@/components/home/PostcodeLookup";
import { ApiError } from "@/lib/apiClient";
import { updateProfile } from "@/lib/profile";
import type {
  Constituency,
  CurrentUser,
  Party,
  ProfileUpdateResult,
} from "@/types/api";

interface ProfileFormProps {
  parties: Party[];
  constituencies: Constituency[];
  user: CurrentUser;
  /** Election day, swap confirmed: the swap fields are frozen. */
  locked: boolean;
  onSaved: (result: ProfileUpdateResult) => void;
}

// Both still HAML. The mobile form is M6; account deletion is not in the
// migration plan's screen list at all.
const hamlMobile = "/user/edit";
const hamlDeleteAccount = "/confirm_account_deletion";

/**
 * Ports app/views/users/edit.html.haml: the two party choices, the
 * constituency, the email, and the warnings that come with changing any of
 * them.
 *
 * The mobile number is deliberately not editable here. It is M6's, and
 * standing up a second copy of the intl-tel-input widget only to throw it away
 * would be waste — so this reports the number's state and links to the legacy
 * page that changes it.
 */
export function ProfileForm({
  parties,
  constituencies,
  user,
  locked,
  onSaved,
}: ProfileFormProps) {
  const preferredId = useId();
  const willingId = useId();
  const emailId = useId();

  const [preferredPartyId, setPreferredPartyId] = useState(
    user.preferredParty ? String(user.preferredParty.id) : "",
  );
  const [willingPartyId, setWillingPartyId] = useState(
    user.willingParty ? String(user.willingParty.id) : "",
  );
  const [onsId, setOnsId] = useState(user.constituencyOnsId ?? "");
  const [postcode, setPostcode] = useState("");
  const [email, setEmail] = useState(user.email ?? "");
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function handleConstituencyPicked(picked: string) {
    setOnsId(picked);
    if (picked !== "") {
      setPostcode("");
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setErrors([]);
    try {
      const result = await updateProfile({
        preferredPartyId,
        willingPartyId,
        constituencyOnsId: onsId,
        email,
      });
      onSaved(result);
    } catch (error) {
      const messages =
        error instanceof ApiError && error.messages.length > 0
          ? error.messages
          : ["Something went wrong - please try that again."];
      setErrors(messages);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="d-flex flex-column gap-3">
        <Form.Group controlId={preferredId}>
          <Form.Label>My preferred party is</Form.Label>
          <Form.Select
            value={preferredPartyId}
            disabled={locked}
            onChange={(event) => setPreferredPartyId(event.target.value)}
          >
            <option value="">...</option>
            {parties.map((party) => (
              <option key={party.id} value={String(party.id)}>
                {party.name}
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        <Form.Group controlId={willingId}>
          <Form.Label>but I'm willing to vote for</Form.Label>
          <Form.Select
            value={willingPartyId}
            disabled={locked}
            onChange={(event) => setWillingPartyId(event.target.value)}
          >
            <option value="">...</option>
            {parties.map((party) => (
              <option key={party.id} value={String(party.id)}>
                {party.name}
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        <ConstituencyAutocomplete
          constituencies={constituencies}
          value={onsId}
          onChange={handleConstituencyPicked}
          disabled={locked}
        />

        {!locked && (
          <PostcodeLookup
            constituencies={constituencies}
            postcode={postcode}
            onPostcodeChange={setPostcode}
            onConstituencyFound={setOnsId}
          />
        )}

        <Form.Group controlId={emailId}>
          <Form.Label>My email address is</Form.Label>
          <Form.Control
            type="email"
            placeholder="me@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Form.Group>

        <div>
          <p className="mb-1">
            My mobile number is{" "}
            {user.mobileVerified ? "verified" : "not verified"}
          </p>
          <a href={hamlMobile}>
            {user.mobileVerified
              ? "Change your mobile number"
              : "Verify your mobile number"}
          </a>
        </div>

        <Alert variant={locked ? "info" : "danger"} className="small mb-0">
          {locked
            ? "It's election day and you've already confirmed your swap, so your party preferences and constituency are currently locked"
            : "Changing your party preferences or constituency will undo any swap that you have agreed to"}
        </Alert>

        {errors.length > 0 && (
          <Alert variant="danger" className="small mb-0" role="alert">
            {errors.map((message) => (
              <p key={message} className="mb-0">
                {message}
              </p>
            ))}
          </Alert>
        )}

        <div className="d-flex justify-content-end">
          <Button type="submit" variant="primary" disabled={saving}>
            Save
          </Button>
        </div>

        <hr className="my-0" />

        <p className="small subdued mb-0">
          If you no longer want to take part in Swap My Vote, you can{" "}
          <a href={hamlDeleteAccount}>delete your account</a>.
        </p>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
corepack yarn test app/frontend/components/profile/ProfileForm.test.tsx
```

Expected: PASS, 6 tests.

- [ ] **Step 5: Write the page**

Create `app/frontend/pages/Profile.tsx`:

```tsx
import { useState } from "react";
import Alert from "react-bootstrap/Alert";
import Card from "react-bootstrap/Card";
import Container from "react-bootstrap/Container";
import Spinner from "react-bootstrap/Spinner";
import { useNavigate } from "react-router-dom";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { useSession } from "@/contexts/useSession";
import { useConstituencies, useParties } from "@/lib/referenceData";
import { spaPaths } from "@/lib/spaPaths";
import type { ProfileUpdateResult } from "@/types/api";

/**
 * Ports app/views/users/edit.html.haml — "Not right? Update your info".
 *
 * A save that changes the willing party or the constituency sends the user to
 * the review screen, which is where the legacy controller sends them too.
 */
export function Profile() {
  const { session, refetchSession } = useSession();
  const parties = useParties();
  const constituencies = useConstituencies();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);

  async function handleSaved(result: ProfileUpdateResult) {
    await refetchSession();
    if (result.reviewRequired) {
      navigate(spaPaths.review);
      return;
    }
    setSaved(true);
  }

  const loading = parties.isPending || constituencies.isPending;

  return (
    <RequireLogin>
      <Container className="container-narrow py-4">
        <Card>
          <Card.Header>
            <h1 className="h4 mb-0">Edit profile</h1>
          </Card.Header>
          <Card.Body>
            {saved && (
              <Alert variant="success" className="small" role="status">
                Your profile has been saved
              </Alert>
            )}

            {loading || !session?.currentUser ? (
              <div className="text-center">
                <Spinner animation="border" role="status">
                  <span className="visually-hidden">Loading</span>
                </Spinner>
              </div>
            ) : (
              <ProfileForm
                parties={parties.data ?? []}
                constituencies={constituencies.data ?? []}
                user={session.currentUser}
                locked={session.flags.votingInfoLocked}
                onSaved={handleSaved}
              />
            )}
          </Card.Body>
        </Card>
      </Container>
    </RequireLogin>
  );
}
```

- [ ] **Step 6: Route it — all three places**

`app/frontend/lib/spaPaths.ts`:

```ts
  profile: "/app/profile",
```

`app/frontend/app/App.tsx`:

```tsx
import { Profile } from "@/pages/Profile";
```

```tsx
                  <Route path={spaPaths.profile} element={<Profile />} />
```

`config/routes.rb`, next to `get "app/constituency"`:

```ruby
  get "app/profile", to: "spa#index"
```

Typecheck will fail until Task 8 adds `spaPaths.review`. Add it now, alongside `profile`:

```ts
  review: "/app/review",
```

- [ ] **Step 7: Verify in the browser**

With the stack running and a signed-in session, visit `http://localhost:3000/app/profile`. Change the email only and save — expect the success alert, no navigation. Change the willing party and save — expect a move to `/app/review` (a blank page until Task 8, which is fine).

- [ ] **Step 8: Gates and commit**

```bash
corepack yarn lint:fix && corepack yarn typecheck && corepack yarn test
git add app/frontend/components/profile/ProfileForm.tsx app/frontend/components/profile/ProfileForm.test.tsx app/frontend/pages/Profile.tsx app/frontend/lib/spaPaths.ts app/frontend/app/App.tsx config/routes.rb
git commit -m "Port the profile edit screen to React behind /app/profile"
```

---

### Task 8: Review screen

**Files:**
- Create: `app/frontend/components/profile/ProfileReview.tsx`
- Create: `app/frontend/pages/Review.tsx`
- Modify: `app/frontend/app/App.tsx`, `config/routes.rb`
- Test: `app/frontend/components/profile/ProfileReview.test.tsx`

**Interfaces:**
- Consumes: `PollChart`, `interpretPoll`, `useConstituencyDetail`, `RequireLogin`, `useSession`, `spaPaths.profile`.
- Produces: `<ProfileReview constituencyName={…} polls={…} willingParty={…} />`.

- [ ] **Step 1: Write the failing test**

Create `app/frontend/components/profile/ProfileReview.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ProfileReview } from "@/components/profile/ProfileReview";
import type { ConstituencyPoll, Party } from "@/types/api";

vi.mock("@/components/polls/PollChart", () => ({
  PollChart: () => <div data-testid="poll-chart" />,
}));

const labour: Party = {
  id: 2,
  name: "Labour",
  color: "#DC241f",
  smvCode: "lab",
};

function poll(overrides: Partial<ConstituencyPoll> = {}): ConstituencyPoll {
  return {
    partyId: 2,
    partyName: "Labour",
    partyShortName: "Lab",
    color: "#DC241f",
    votes: 4210,
    marginalScore: 500,
    signedMarginalScore: 500,
    ...overrides,
  };
}

function renderReview(props: Partial<Parameters<typeof ProfileReview>[0]> = {}) {
  render(
    <MemoryRouter>
      <ProfileReview
        constituencyName="Woking"
        polls={[poll()]}
        willingParty={labour}
        {...props}
      />
    </MemoryRouter>,
  );
}

describe("ProfileReview", () => {
  it("charts the constituency", () => {
    renderReview();

    expect(screen.getByTestId("poll-chart")).toBeInTheDocument();
  });

  it("says a marginal vote could make a difference", () => {
    renderReview();

    expect(screen.getByText(/could make a difference/i)).toHaveTextContent(
      /Labour/,
    );
    expect(screen.getByText(/could make a difference/i)).toHaveTextContent("5%");
  });

  it("calls a big lead a safe win", () => {
    renderReview({
      polls: [poll({ marginalScore: 2400, signedMarginalScore: 2400 })],
    });

    expect(screen.getByText(/safe win/i)).toBeInTheDocument();
  });

  it("says so when there is no poll for the willing party", () => {
    renderReview({ polls: [poll({ partyId: 99, partyName: "Green" })] });

    expect(screen.getByText(/no polling data found/i)).toBeInTheDocument();
  });

  it("offers a way onward and a way back", () => {
    renderReview();

    expect(screen.getByRole("link", { name: /proceed/i })).toHaveAttribute(
      "href",
      "/user",
    );
    expect(screen.getByRole("link", { name: /change/i })).toHaveAttribute(
      "href",
      "/app/profile",
    );
  });

  it("shows the legacy 'you shouldn't be here' line with nothing to review", () => {
    renderReview({ willingParty: null });

    expect(screen.getByText(/you shouldn't be here/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
corepack yarn test app/frontend/components/profile/ProfileReview.test.tsx
```

Expected: FAIL — cannot resolve `@/components/profile/ProfileReview`.

- [ ] **Step 3: Write ProfileReview**

Create `app/frontend/components/profile/ProfileReview.tsx`:

```tsx
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import { Link } from "react-router-dom";
import { PollChart } from "@/components/polls/PollChart";
import { interpretPoll } from "@/lib/pollInterpretation";
import { spaPaths } from "@/lib/spaPaths";
import type { ConstituencyPoll, Party } from "@/types/api";

interface ProfileReviewProps {
  constituencyName: string | null;
  polls: ConstituencyPoll[];
  willingParty: Party | null;
}

// The dashboard is still HAML (M7), so proceeding leaves the SPA.
const hamlDashboard = "/user";

/**
 * Ports app/views/users/review.haml: after a change to the offered vote, show
 * what the polls say about it before the user commits.
 */
export function ProfileReview({
  constituencyName,
  polls,
  willingParty,
}: ProfileReviewProps) {
  if (!willingParty || !constituencyName) {
    return (
      <Alert variant="warning" className="small">
        <p>
          Whoops, you shouldn't be here.{" "}
          {!willingParty && "We don't know the party you are offering to vote for. "}
          {!constituencyName && "We don't know the constituency you're going to vote in. "}
          Please go and edit your profile details, and that should bring you
          back here when you're done.
        </p>
        <Link to={spaPaths.profile} className="btn btn-primary">
          Edit profile
        </Link>
      </Alert>
    );
  }

  const partyPoll = polls.find((poll) => poll.partyId === willingParty.id);
  const interpretation = interpretPoll(partyPoll);

  return (
    <div className="d-flex flex-column gap-3">
      <p className="small mb-0">
        Predicted results for {constituencyName}
      </p>

      <PollChart polls={polls} constituencyName={constituencyName} />

      {interpretation === null ? (
        <p className="mb-0">
          No polling data found for {willingParty.name} in {constituencyName},
          so we can't interpret that for you.
        </p>
      ) : (
        <p className="mb-0">
          {interpretation.kind === "could-make-a-difference" &&
            `⭐ Looks like your vote could make a difference for ${willingParty.name}, who are ${
              interpretation.leading
                ? "leading"
                : "only trailing the leading party"
            } by ${interpretation.percent} in the polls for ${constituencyName}, so it's more likely that people supporting ${willingParty.name} will want to swap with you.`}
          {interpretation.kind === "safe-win" &&
            `Looks like your vote may be supporting a safe win for ${willingParty.name}, who are currently leading by ${interpretation.percent} in the polls for ${constituencyName}, so it's less likely that people supporting ${willingParty.name} will want to swap with you.`}
          {interpretation.kind === "trailing" &&
            `${willingParty.name} are trailing by ${interpretation.percent} in the polls for ${constituencyName}, and may still lose despite this swap, so it's less likely that people supporting ${willingParty.name} will want to swap with you.`}
        </p>
      )}

      <p className="mb-0">
        <strong>
          Do you want to proceed with this party, or change your offered vote?
        </strong>
      </p>

      <div className="d-flex gap-2">
        <Button href={hamlDashboard} variant="primary">
          Proceed
        </Button>
        <Link to={spaPaths.profile} className="btn btn-secondary">
          Change
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
corepack yarn test app/frontend/components/profile/ProfileReview.test.tsx
```

Expected: PASS, 6 tests. `react-bootstrap`'s `Button href=` renders an `<a>`, which is what the "way onward" assertion needs.

- [ ] **Step 5: Write the page**

Create `app/frontend/pages/Review.tsx`:

```tsx
import Card from "react-bootstrap/Card";
import Container from "react-bootstrap/Container";
import Spinner from "react-bootstrap/Spinner";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { ProfileReview } from "@/components/profile/ProfileReview";
import { useSession } from "@/contexts/useSession";
import { useConstituencyDetail } from "@/lib/profile";

/**
 * Ports app/views/users/review.haml — shown after a save that changed the
 * offered vote.
 */
export function Review() {
  const { session } = useSession();
  const user = session?.currentUser ?? null;
  const constituency = useConstituencyDetail(user?.constituencyOnsId ?? null);

  return (
    <RequireLogin>
      <Container className="container-narrow py-4">
        <Card>
          <Card.Header>
            <h1 className="h4 mb-0">Your offered vote</h1>
          </Card.Header>
          <Card.Body>
            {constituency.isPending && user?.constituencyOnsId ? (
              <div className="text-center">
                <Spinner animation="border" role="status">
                  <span className="visually-hidden">Loading</span>
                </Spinner>
              </div>
            ) : (
              <ProfileReview
                constituencyName={user?.constituencyName ?? null}
                polls={constituency.data?.polls ?? []}
                willingParty={user?.willingParty ?? null}
              />
            )}
          </Card.Body>
        </Card>
      </Container>
    </RequireLogin>
  );
}
```

- [ ] **Step 6: Route it**

`app/frontend/app/App.tsx`:

```tsx
import { Review } from "@/pages/Review";
```

```tsx
                  <Route path={spaPaths.review} element={<Review />} />
```

`config/routes.rb`, next to the other two:

```ruby
  get "app/review", to: "spa#index"
```

`spaPaths.review` already exists from Task 7.

- [ ] **Step 7: Verify in the browser**

With the stack running and a signed-in user who has a constituency with polls: change the willing party at `/app/profile`, save, and confirm the review screen draws a chart and reads sensibly. Then check Proceed lands on the HAML dashboard and Change returns to the form without a page load.

- [ ] **Step 8: Gates and commit**

```bash
corepack yarn lint:fix && corepack yarn typecheck && corepack yarn test
git add app/frontend/components/profile/ProfileReview.tsx app/frontend/components/profile/ProfileReview.test.tsx app/frontend/pages/Review.tsx app/frontend/app/App.tsx config/routes.rb
git commit -m "Port the post-save review screen to React behind /app/review"
```

---

### Task 9: End-to-end coverage

**Files:**
- Create: `playwright-tests/support/seedProfileUser.ts`
- Create: `playwright-tests/support/auth.ts`
- Create: `playwright-tests/profile.spec.ts`
- Modify: `playwright-tests/accessibility.spec.ts`

**Interfaces:**
- Consumes: the three routed screens; `spaPaths`.
- Produces: `seedProfileUser()` (returns `{ email, password }`) and `signIn(page, credentials)`.

- [ ] **Step 1: Write the seed helper**

Create `playwright-tests/support/seedProfileUser.ts`:

```ts
import { execFileSync } from "node:child_process";

export interface TestCredentials {
  email: string;
  password: string;
}

const credentials: TestCredentials = {
  email: "e2e-profile@example.com",
  password: "e2e-profile-password",
};

// Ruby, run against the dev database the stack is already serving. Everything
// is idempotent (find_or_create_by / update) so re-running the suite does not
// pile up rows, and the user is left in a known state whatever the last run
// did to it.
const script = `
  woking = OnsConstituency.find_or_create_by!(ons_id: "E14001063") { |c| c.name = "Woking" }
  OnsConstituency.find_or_create_by!(ons_id: "E14001009") { |c| c.name = "Wakefield" }
  green = Party.find_or_create_by!(name: "Green") { |p| p.color = "#6AB023" }
  labour = Party.find_or_create_by!(name: "Labour") { |p| p.color = "#DC241f" }

  [[green, 1200], [labour, 4210]].each do |party, votes|
    poll = Poll.find_or_initialize_by(constituency_ons_id: woking.ons_id, party_id: party.id)
    poll.update!(votes: votes, marginal_score: 3010)
  end

  user = User.find_or_initialize_by(email: "${credentials.email}")
  user.password = "${credentials.password}"
  user.name = "E2E Voter"
  user.constituency_ons_id = woking.ons_id
  user.preferred_party = green
  user.willing_party = labour
  user.save!
`;

/** Puts the fixture user, parties, constituency and polls in the dev database
 *  the E2E stack is serving. */
export function seedProfileUser(): TestCredentials {
  execFileSync("bin/rails", ["runner", script], { stdio: "inherit" });
  return credentials;
}
```

- [ ] **Step 2: Write the sign-in helper**

Create `playwright-tests/support/auth.ts`:

```ts
import { expect, type Page } from "@playwright/test";
import type { TestCredentials } from "./seedProfileUser";

/**
 * Signs in through the legacy Devise form. Auth is M5: until then this is the
 * only way in, and it is also the real thing a user does today.
 */
export async function signIn(
  page: Page,
  { email, password }: TestCredentials,
): Promise<void> {
  await page.goto("/users/sign_in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).not.toHaveURL(/sign_in/);
}
```

- [ ] **Step 3: Write the E2E spec**

Create `playwright-tests/profile.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { spaPaths } from "@/lib/spaPaths";
import { signIn } from "./support/auth";
import { seedProfileUser } from "./support/seedProfileUser";

const credentials = seedProfileUser();

test.beforeEach(async ({ page }) => {
  await signIn(page, credentials);
});

test("must send a changed offered vote to the review screen", async ({
  page,
}) => {
  await page.goto(spaPaths.profile);

  await page.getByLabel(/willing to vote for/i).selectOption({ label: "Green" });
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page).toHaveURL(new RegExp(`${spaPaths.review}$`));
  await expect(page.getByText(/predicted results for Woking/i)).toBeVisible();
});

test("must save an email change without asking for a review", async ({
  page,
}) => {
  await page.goto(spaPaths.profile);

  await page.getByLabel(/email address/i).fill(credentials.email);
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByText(/your profile has been saved/i)).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`${spaPaths.profile}$`));
});

test("must refuse to save the constituency screen with nothing chosen", async ({
  page,
}) => {
  await page.goto(spaPaths.constituency);

  await page.getByRole("button", { name: "Show all" }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByText(/you must tell us your constituency/i)).toBeVisible();
});
```

The third test assumes the fixture user's constituency is pre-filled, so clear it first if the autocomplete keeps the value: replace the two interaction lines with `await page.getByLabel(/constituency/i).fill("");` followed by `await page.keyboard.press("Tab");`, which is what `_removeIfInvalid` reacts to.

- [ ] **Step 4: Add the three screens to the axe scan**

In `playwright-tests/accessibility.spec.ts`, the scanned pages are public. These three need a session, so add a second block below the existing loop:

```ts
import { signIn } from "./support/auth";
import { seedProfileUser } from "./support/seedProfileUser";

const credentials = seedProfileUser();

const signedInPages = [
  { name: "Profile", path: spaPaths.profile },
  { name: "Constituency", path: spaPaths.constituency },
  { name: "Review", path: spaPaths.review },
];

for (const { name, path } of signedInPages) {
  test(`must report no WCAG A/AA violations when the ${name} page is rendered`, async ({
    page,
  }, testInfo) => {
    await signIn(page, credentials);
    await page.goto(path);
    await expect(page.getByRole("main")).not.toBeEmpty();

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
}
```

- [ ] **Step 5: Run the E2E suite**

```bash
corepack yarn e2e
```

Expected: green. Requires `foreman` on PATH and a prepared dev database (`bin/rails db:prepare`). Fix any axe violation in the component, not by loosening the scan.

- [ ] **Step 6: Run every gate**

```bash
corepack yarn lint:fix && corepack yarn typecheck && corepack yarn test
PATH="$HOME/.rbenv/shims:$PATH" bundle exec rspec
PATH="$HOME/.rbenv/shims:$PATH" bundle exec rubocop
```

Expected: all green.

- [ ] **Step 7: Commit and push**

```bash
git add playwright-tests
git commit -m "Cover the M4 profile screens with E2E and axe specs"
git push -u origin frontend-m4-profile-edit
```

- [ ] **Step 8: Update the modernization plan**

In `docs/frontend-modernization-plan.md`, mark M4's scope as landed the way M3's was, noting that the mobile field on the profile screen is a status link until M6.

```bash
git add docs/frontend-modernization-plan.md
git commit -m "Record M4 as landed in the modernization plan"
git push
```
