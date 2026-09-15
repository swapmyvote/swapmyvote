# M10: Account lifecycle (password reset + account deletion) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port password reset and account deletion to React — the last four user-facing screens served only by HAML — behind three new API endpoints.

**Architecture:** A new `Api::V1::PasswordsController` wrapping Devise's own `send_reset_password_instructions` and `reset_password_by_token`, plus `destroy` on the existing `Api::V1::UsersController`. Four screens under `pages/`. The Devise mailer is **not** edited: it keeps linking to `/users/password/edit`, which keeps serving HAML until cutover adds that path to the SPA allow-list, so live reset emails work throughout.

**Tech Stack:** Rails 8.1 + Devise (`:recoverable`), Alba serializers, RSpec request specs, React 19 + TypeScript, react-bootstrap, `@tanstack/react-query`, react-router-dom v7, Vitest + RTL, Playwright + axe, Biome.

**Spec:** [`docs/superpowers/specs/2026-09-14-remaining-pages-design.md`](../specs/2026-09-14-remaining-pages-design.md)

**Depends on:** the M9 plan (`2026-09-14-m9-static-content.md`). Task 6 here repoints a link M9's `Faq.tsx` deliberately left pointing at the legacy path.

## Global Constraints

- **Never flip a canonical route to React.** `/users/password/new`, `/users/password/edit`, `/confirm_account_deletion` and `/account_deleted` all keep serving their current views. React ships at `/app/*` only. Cutover is M11.
- **Do not edit the Devise mailer.** `app/views/devise/mailer/reset_password_instructions.html.erb` keeps linking to `/users/password/edit`. That is what makes real reset emails keep working during coexistence.
- **`config/routes.rb` allow-list, `spaPaths.ts` and the `<Routes>` table in `App.tsx` stay in lockstep.**
- **Every API action enforces its own guards.** The client's copy of the flags is UX only. Never trust the client.
- **TypeScript style:** always use braces in `if`/`else`/`for`/`while` bodies, even single-statement.
- **Quality gates before every commit:** `corepack yarn lint:fix`, `corepack yarn typecheck`, `corepack yarn test`, `bundle exec rspec`. **Check the exit code explicitly** — do not pipe through `tail` and read only the last lines.
- **Ruby is pinned to 3.3.12 via rbenv.** Prefix Ruby commands with `PATH="$HOME/.rbenv/shims:$PATH"`.
- **`.env.test` must exist** for RSpec (see issue #1075) containing `export SERVER_HOST=localhost`.
- **Account deletion is irreversible.** Every test that deletes must build its own user; never reuse a fixture another example depends on.

---

### Task 1: `POST /api/v1/password` — request reset instructions

Wraps `User.send_reset_password_instructions`.

**The one deliberate divergence:** this **always** answers `202`, whether or not the address is registered. `config.paranoid` is off (`config/initializers/devise.rb:87`), so the legacy HAML page answers an unknown address with "Email not found" — an email-enumeration oracle. A JSON endpoint is far easier to script against than a form, so the new surface must not reproduce it. The accepted cost: someone who mistypes their address gets no feedback and simply never receives the mail.

**Files:**
- Create: `app/controllers/api/v1/passwords_controller.rb`
- Modify: `config/routes.rb` (inside `namespace :api do namespace :v1 do`, after `resource :vote`)
- Test: `spec/requests/api/v1/passwords_spec.rb` (create)

**Interfaces:**
- Consumes: `reject_when_logged_in!` from `Api::V1::BaseController`.
- Produces: `POST /api/v1/password` accepting `{ email }`, answering `202 { "status": "accepted" }`. Read by Task 4.

- [ ] **Step 1: Write the failing test**

Create `spec/requests/api/v1/passwords_spec.rb`:

```ruby
require "rails_helper"

RSpec.describe "Api::V1::Passwords", type: :request do
  include Devise::Test::IntegrationHelpers

  def json
    JSON.parse(response.body)
  end

  describe "POST /api/v1/password" do
    it "sends reset instructions to a registered address" do
      user = create(:user, name: "Ada Lovelace")

      expect {
        post "/api/v1/password", params: { email: user.email }, as: :json
      }.to change { ActionMailer::Base.deliveries.count }.by(1)

      expect(response).to have_http_status(:accepted)
      expect(user.reload.reset_password_token).to be_present
    end

    # Deliberate divergence from the HAML page, which says "Email not found"
    # and so answers whether an address is registered. See the M10 design doc:
    # a JSON endpoint is a much easier enumeration oracle than a form, and the
    # cost — no feedback on a typo — is accepted.
    it "answers identically for an unknown address, and sends nothing" do
      expect {
        post "/api/v1/password", params: { email: "nobody@example.com" },
                                 as: :json
      }.not_to change { ActionMailer::Base.deliveries.count }

      expect(response).to have_http_status(:accepted)
    end

    it "answers identically for a blank address" do
      post "/api/v1/password", params: { email: "" }, as: :json

      expect(response).to have_http_status(:accepted)
    end

    # Mirrors the require_no_authentication Devise prepends to its own
    # PasswordsController.
    it "refuses a caller who is already logged in" do
      sign_in create(:user, name: "Grace Hopper")

      post "/api/v1/password", params: { email: "ada@example.com" }, as: :json

      expect(response).to have_http_status(:forbidden)
      expect(json["error"]["code"]).to eq("already_authenticated")
    end
  end
end
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
PATH="$HOME/.rbenv/shims:$PATH" bundle exec rspec spec/requests/api/v1/passwords_spec.rb; echo "EXIT=$?"
```

Expected: FAIL — no route matches `POST /api/v1/password`.

- [ ] **Step 3: Add the route**

In `config/routes.rb`, inside the `namespace :api do namespace :v1 do` block, after the `resource :vote` line:

```ruby
      # Ported from Devise::PasswordsController; /users/password/{new,edit}
      # keep serving Devise HAML until cutover — which is what keeps the
      # reset links in already-sent emails working.
      resource :password, only: [:create, :update], controller: "passwords"
```

- [ ] **Step 4: Write the controller**

Create `app/controllers/api/v1/passwords_controller.rb`:

```ruby
module Api
  module V1
    # Password reset, ported from Devise::PasswordsController.
    #
    # The Devise mailer is deliberately untouched: it keeps linking to
    # /users/password/edit, which keeps serving Devise HAML until cutover. So
    # reset links already in people's inboxes keep working throughout the
    # migration, and at M11 that same URL starts landing on the React screen.
    class PasswordsController < BaseController
      before_action :reject_when_logged_in!

      # Always 202, registered or not.
      #
      # config.paranoid is off, so the HAML page answers an unknown address
      # with "Email not found" — it will tell anyone who asks whether a given
      # person has an account. That is a much cheaper oracle to script against
      # as JSON than as a form, so this endpoint refuses to be one. The cost is
      # real and accepted: someone who mistypes their address gets no feedback
      # and simply never receives the mail.
      def create
        User.send_reset_password_instructions(email: params[:email])
        render json: { status: "accepted" }, status: :accepted
      end
    end
  end
end
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
PATH="$HOME/.rbenv/shims:$PATH" bundle exec rspec spec/requests/api/v1/passwords_spec.rb; echo "EXIT=$?"
PATH="$HOME/.rbenv/shims:$PATH" bundle exec rubocop app/controllers/api/v1/passwords_controller.rb; echo "EXIT=$?"
```

Expected: both `EXIT=0`.

- [ ] **Step 6: Commit**

```bash
git add app/controllers/api/v1/passwords_controller.rb config/routes.rb \
        spec/requests/api/v1/passwords_spec.rb
git commit -m "Add POST /api/v1/password to request a reset

Always answers 202, registered or not. The HAML page says \"Email not
found\", which answers whether any given address has an account; a JSON
endpoint is a much cheaper oracle for that than a form, so this one
declines to be one.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: `PUT /api/v1/password` — submit a new password

Wraps `User.reset_password_by_token`. `config.sign_in_after_reset_password` is left at its default of `true`, so a successful reset signs the user in and the endpoint answers with the **session payload** — the same shape `POST /api/v1/session` returns, so the SPA primes its cache by the path it already uses after login.

**Files:**
- Modify: `app/controllers/api/v1/passwords_controller.rb`
- Test: `spec/requests/api/v1/passwords_spec.rb`

**Interfaces:**
- Consumes: `render_session_payload` from the `Api::V1::SessionPayload` concern (`app/controllers/concerns/api/v1/session_payload.rb`), included as `include SessionPayload` — the same way `Api::V1::VoteController:14` and `SessionController:10` do it.
- Produces: `PUT /api/v1/password` accepting `{ token, password, password_confirmation }`, answering `200` with the session payload, or `422` with `invalid_token` / `validation_failed`. Read by Task 4.

- [ ] **Step 1: Write the failing test**

Append inside the top-level `RSpec.describe` in `spec/requests/api/v1/passwords_spec.rb`:

```ruby
  describe "PUT /api/v1/password" do
    # Devise returns the raw token and stores its digest, so the token a test
    # submits has to come from this call, not from the column.
    def reset_token_for(user)
      user.send_reset_password_instructions
    end

    it "sets the new password and signs the user in" do
      user = create(:user, name: "Ada Lovelace")
      token = reset_token_for(user)

      put "/api/v1/password",
          params: { token: token, password: "correct-horse-battery",
                    password_confirmation: "correct-horse-battery" },
          as: :json

      expect(response).to have_http_status(:ok)
      expect(json["currentUser"]["id"]).to eq(user.id)
      expect(user.reload.valid_password?("correct-horse-battery")).to be(true)
    end

    it "refuses an unknown token" do
      create(:user, name: "Ada Lovelace")

      put "/api/v1/password",
          params: { token: "not-a-real-token", password: "correct-horse-battery",
                    password_confirmation: "correct-horse-battery" },
          as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json["error"]["code"]).to eq("invalid_token")
    end

    it "refuses a token older than config.reset_password_within" do
      user = create(:user, name: "Ada Lovelace")
      token = reset_token_for(user)

      travel(7.hours) do
        put "/api/v1/password",
            params: { token: token, password: "correct-horse-battery",
                      password_confirmation: "correct-horse-battery" },
            as: :json
      end

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json["error"]["code"]).to eq("invalid_token")
    end

    it "refuses a mismatched confirmation and leaves the password alone" do
      user = create(:user, name: "Ada Lovelace")
      token = reset_token_for(user)

      put "/api/v1/password",
          params: { token: token, password: "correct-horse-battery",
                    password_confirmation: "something-else" },
          as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json["error"]["code"]).to eq("validation_failed")
      expect(json["error"]["fields"]).to have_key("password_confirmation")
      expect(user.reload.valid_password?("correct-horse-battery")).to be(false)
    end

    it "refuses a password below the minimum length" do
      user = create(:user, name: "Ada Lovelace")
      token = reset_token_for(user)

      put "/api/v1/password",
          params: { token: token, password: "short", password_confirmation: "short" },
          as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json["error"]["code"]).to eq("validation_failed")
    end

    # A used token must not work twice — otherwise anyone who later reads the
    # email can take the account over.
    it "refuses a token that has already been spent" do
      user = create(:user, name: "Ada Lovelace")
      token = reset_token_for(user)
      put "/api/v1/password",
          params: { token: token, password: "correct-horse-battery",
                    password_confirmation: "correct-horse-battery" },
          as: :json
      delete "/api/v1/session"

      put "/api/v1/password",
          params: { token: token, password: "another-password-entirely",
                    password_confirmation: "another-password-entirely" },
          as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json["error"]["code"]).to eq("invalid_token")
    end

    it "refuses a caller who is already logged in" do
      sign_in create(:user, name: "Grace Hopper")

      put "/api/v1/password",
          params: { token: "anything", password: "correct-horse-battery",
                    password_confirmation: "correct-horse-battery" },
          as: :json

      expect(response).to have_http_status(:forbidden)
      expect(json["error"]["code"]).to eq("already_authenticated")
    end
  end
```

If `travel` is unavailable, add `include ActiveSupport::Testing::TimeHelpers` beside the Devise helper include at the top of the file.

- [ ] **Step 2: Run the test to verify it fails**

```bash
PATH="$HOME/.rbenv/shims:$PATH" bundle exec rspec spec/requests/api/v1/passwords_spec.rb -e "PUT /api/v1/password"; echo "EXIT=$?"
```

Expected: FAIL — the route exists but `update` is not defined.

- [ ] **Step 3: Implement `update`**

Add `include SessionPayload` directly under the `class PasswordsController < BaseController` line — the concern lives at `app/controllers/concerns/api/v1/session_payload.rb` and is what `SessionController` and `VoteController` both use to render this exact shape.

Then add to `app/controllers/api/v1/passwords_controller.rb`, inside the class:

```ruby
      # config.sign_in_after_reset_password is left at its default of true, so
      # a successful reset logs the user straight in and this answers with the
      # session payload — the same shape POST /api/v1/session returns, so the
      # SPA primes its cache by the path it already uses after login.
      def update
        user = User.reset_password_by_token(
          reset_password_token: params[:token],
          password: params[:password],
          password_confirmation: params[:password_confirmation]
        )

        return render_invalid_token if user.id.nil?
        return render_reset_errors(user) if user.errors.any?

        sign_in(user)
        render_session_payload
      end

      private

      # reset_password_by_token answers with an unpersisted User carrying a
      # :reset_password_token error when the token is unknown, spent, or older
      # than config.reset_password_within (6 hours). That is a different kind
      # of failure from a weak password and the screen says something
      # different about it, so it gets its own code.
      def render_invalid_token
        render_error(
          code: "invalid_token",
          status: :unprocessable_entity,
          messages: ["That password reset link is invalid or has expired. " \
                     "Please request a new one."]
        )
      end

      def render_reset_errors(user)
        render_error(
          code: "validation_failed",
          status: :unprocessable_entity,
          messages: user.errors.full_messages,
          fields: user.errors.to_hash(true)
        )
      end
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
PATH="$HOME/.rbenv/shims:$PATH" bundle exec rspec spec/requests/api/v1/passwords_spec.rb; echo "EXIT=$?"
PATH="$HOME/.rbenv/shims:$PATH" bundle exec rubocop app/controllers/api/v1/passwords_controller.rb; echo "EXIT=$?"
```

Expected: both `EXIT=0`. If the "already spent" example fails because `reset_password_by_token` still accepts the token, check whether `config.sign_in_after_reset_password` left the token in place; Devise clears it on success, so a failure here is a real finding — report it rather than deleting the test.

- [ ] **Step 5: Commit**

```bash
git add app/controllers/api/v1/passwords_controller.rb \
        spec/requests/api/v1/passwords_spec.rb
git commit -m "Add PUT /api/v1/password to complete a reset

Signs the user in on success (Devise's default) and answers with the
session payload, so the SPA primes its cache the same way it does after
login. An unknown, spent or expired token gets its own error code — the
screen says something different about that than about a weak password.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: `DELETE /api/v1/user` — delete the account

Ports `UsersController#destroy`. The guard mirrors `restricted_when_voting_open`, which today redirects silently, leaving the user with no idea why nothing happened.

**The cascade already works and needs no controller code.** `User` declares `before_destroy :clear_swap` (`app/models/user.rb:30`) and `Swap` declares `before_destroy :notify_users_of_cancelled_swap` (`app/models/swap.rb:7`), so the partner's cancellation email is sent by the model layer. The confirmation page's promise — "this will cancel any pending or confirmed swaps you have made" — is kept without help from here.

**Files:**
- Modify: `app/controllers/api/v1/users_controller.rb`
- Modify: `config/routes.rb:` the `resource :user, only: [:update]` line
- Test: `spec/requests/api/v1/users_spec.rb`

**Interfaces:**
- Consumes: `require_logged_in!`, `reject_when_voting_info_locked!`, the same session-payload render as Task 2.
- Produces: `DELETE /api/v1/user`, answering `200` with the signed-out session payload. Read by Task 5.

- [ ] **Step 1: Write the failing test**

Append inside the top-level `RSpec.describe` in `spec/requests/api/v1/users_spec.rb`:

```ruby
  describe "DELETE /api/v1/user" do
    it "refuses an unauthenticated caller" do
      delete "/api/v1/user"

      expect(response).to have_http_status(:unauthorized)
      expect(json["error"]["code"]).to eq("unauthenticated")
    end

    it "deletes the account and answers with a signed-out session" do
      user = create(:user, name: "Ada Lovelace")
      sign_in user

      delete "/api/v1/user"

      expect(response).to have_http_status(:ok)
      expect(json["currentUser"]).to be_nil
      expect(User.find_by(id: user.id)).to be_nil
    end

    it "leaves the caller signed out afterwards" do
      sign_in create(:user, name: "Ada Lovelace")

      delete "/api/v1/user"
      get "/api/v1/session"

      expect(json["currentUser"]).to be_nil
    end

    # The models do this, not the controller: User before_destroy :clear_swap,
    # Swap before_destroy :notify_users_of_cancelled_swap. Asserted here
    # because it is the promise the confirmation screen makes.
    it "cancels the swap and tells the partner" do
      user = create(:user, name: "Ada Lovelace")
      partner = create(:user, name: "Grace Hopper")
      user.create_outgoing_swap!(chosen_user: partner, confirmed: true)
      user.save!
      sign_in user

      expect {
        delete "/api/v1/user"
      }.to change { ActionMailer::Base.deliveries.count }.by_at_least(1)

      expect(partner.reload.swap).to be_nil
    end

    # Mirrors UsersController#restricted_when_voting_open, which redirects
    # silently. Deleting mid-election would destroy a confirmed swap on the
    # day it matters.
    it "refuses once voting is open and the swap is confirmed" do
      user = create(:user, name: "Ada Lovelace")
      user.create_outgoing_swap!(chosen_user: create(:user, name: "Grace Hopper"),
                                 confirmed: true)
      user.save!
      sign_in user
      allow_any_instance_of(Api::V1::UsersController)
        .to receive(:voting_info_locked?).and_return(true)

      delete "/api/v1/user"

      expect(response).to have_http_status(:forbidden)
      expect(json["error"]["code"]).to eq("voting_info_locked")
      expect(User.find_by(id: user.id)).to be_present
    end
  end
```

If `users_spec.rb` sets `SWAPMYVOTE_MODE` to drive phase gates rather than stubbing, follow that file's existing convention for the last example instead of `allow_any_instance_of`.

- [ ] **Step 2: Run the test to verify it fails**

```bash
PATH="$HOME/.rbenv/shims:$PATH" bundle exec rspec spec/requests/api/v1/users_spec.rb -e "DELETE /api/v1/user"; echo "EXIT=$?"
```

Expected: FAIL — no route matches.

- [ ] **Step 3: Add the route**

In `config/routes.rb`, change the user resource line:

```ruby
      # The logged-in user's own profile — the React profile and constituency
      # screens both patch this; the account-deletion screen destroys it.
      resource :user, only: [:update, :destroy], controller: "users"
```

- [ ] **Step 4: Implement `destroy`**

In `app/controllers/api/v1/users_controller.rb`, the existing `before_action` line runs `reject_when_voting_info_locked!` for every action, which is what `destroy` needs too — leave it as is. Add above `private`:

```ruby
      # Ports UsersController#destroy.
      #
      # The swap teardown and the partner's cancellation email are the models'
      # work — User before_destroy :clear_swap, Swap before_destroy
      # :notify_users_of_cancelled_swap — so there is deliberately nothing
      # about swaps here.
      #
      # reset_session rather than the legacy `session[:user_id] = nil`, which
      # is a pre-Devise leftover that has not held the session for years.
      def destroy
        current_user.destroy!
        reset_session
        render_session_payload
      end
```

`Api::V1::UsersController` does not include `SessionPayload` yet — add `include SessionPayload` under its class line, as Task 2 did for the passwords controller.

- [ ] **Step 5: Run the tests to verify they pass**

```bash
PATH="$HOME/.rbenv/shims:$PATH" bundle exec rspec spec/requests/api/v1/users_spec.rb; echo "EXIT=$?"
PATH="$HOME/.rbenv/shims:$PATH" bundle exec rubocop app/controllers/api/v1/users_controller.rb; echo "EXIT=$?"
```

Expected: both `EXIT=0`.

- [ ] **Step 6: Run the whole backend suite**

```bash
PATH="$HOME/.rbenv/shims:$PATH" bundle exec rspec; echo "EXIT=$?"
```

Expected: `EXIT=0`. Anything failing that this task did not touch should be checked against `master` before you treat it as yours.

- [ ] **Step 7: Commit**

```bash
git add app/controllers/api/v1/users_controller.rb config/routes.rb \
        spec/requests/api/v1/users_spec.rb
git commit -m "Add DELETE /api/v1/user to delete an account

Refuses once voting is open and the swap is confirmed, where the legacy
controller redirected silently. Swap teardown and the partner's email stay
where they already are, in the models' before_destroy hooks.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: The password reset screens

**Files:**
- Create: `app/frontend/lib/password.ts`, `app/frontend/lib/password.test.tsx`
- Create: `app/frontend/pages/PasswordNew.tsx`, `PasswordNew.test.tsx`
- Create: `app/frontend/pages/PasswordEdit.tsx`, `PasswordEdit.test.tsx`
- Modify: `app/frontend/lib/spaPaths.ts`, `config/routes.rb`, `app/frontend/app/App.tsx`

**Interfaces:**
- Consumes: the two endpoints from Tasks 1 and 2; `RequireLoggedOut` from `@/components/auth/RequireLoggedOut`; `sessionQueryKey` from `@/contexts/SessionContext`.
- Produces: `spaPaths.passwordNew` (`"/app/password/new"`), `spaPaths.passwordEdit` (`"/app/password/edit"`); `requestPasswordReset(email)` and `useResetPassword()` from `@/lib/password`. `spaPaths.passwordNew` is read by Task 6.

**Canonical paths at cutover are not these minus `/app`** — M11 maps `/app/password/new` → `/users/password/new` and `/app/password/edit` → `/users/password/edit` (the Devise paths the mailer links to). Put that in the `spaPaths.ts` comment.

- [ ] **Step 1: Add the paths and routes**

In `app/frontend/lib/spaPaths.ts`, after the M9 entries:

```typescript
  passwordNew: "/app/password/new",
  passwordEdit: "/app/password/edit",
```

with a comment above them:

```typescript
  // Cutover maps these onto the Devise paths — /users/password/new and
  // /users/password/edit — not onto themselves minus the `/app` prefix. The
  // second is what the reset email links to, and the mailer is never edited.
```

In `config/routes.rb`, after the M9 block:

```ruby
  # M10 account lifecycle. /users/password/* keep serving Devise HAML until
  # cutover, which is what keeps already-sent reset links working.
  get "app/password/new", to: "spa#index"
  get "app/password/edit", to: "spa#index"
```

- [ ] **Step 2: Write the failing test for the mutations**

Create `app/frontend/lib/password.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/lib/apiClient";
import { requestPasswordReset, useResetPassword } from "@/lib/password";
import { loggedOutSession, sessionPayload, testUser } from "@/test/sessionFixtures";

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("password", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("posts the address to request a reset", async () => {
    const post = vi.spyOn(apiClient, "post").mockResolvedValue({ status: "accepted" });

    await requestPasswordReset("ada@example.com");

    expect(post).toHaveBeenCalledWith("/password", { email: "ada@example.com" });
  });

  // snake_case at the API boundary, as lib/auth.ts and lib/profile.ts do.
  it("puts the token and both password fields to complete a reset", async () => {
    const put = vi
      .spyOn(apiClient, "put")
      .mockResolvedValue(sessionPayload({ currentUser: testUser }));
    const { result } = renderHook(() => useResetPassword(), { wrapper });

    result.current.mutate({
      token: "a-token",
      password: "correct-horse",
      passwordConfirmation: "correct-horse",
    });

    await waitFor(() => {
      expect(put).toHaveBeenCalledWith("/password", {
        token: "a-token",
        password: "correct-horse",
        password_confirmation: "correct-horse",
      });
    });
  });

  it("primes the session cache from the response", async () => {
    const session = sessionPayload({ currentUser: testUser });
    vi.spyOn(apiClient, "put").mockResolvedValue(session);
    const { result } = renderHook(() => useResetPassword(), { wrapper });

    result.current.mutate({
      token: "a-token",
      password: "correct-horse",
      passwordConfirmation: "correct-horse",
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(session);
    });
    expect(session).not.toEqual(loggedOutSession);
  });
});
```

`apiClient` already exposes `put` and `delete` (`app/frontend/lib/apiClient.ts:96-97`), so no client change is needed.

- [ ] **Step 3: Run the test to verify it fails**

```bash
corepack yarn test password; echo "EXIT=$?"
```

Expected: FAIL — `@/lib/password` does not exist.

- [ ] **Step 4: Write the mutations**

Create `app/frontend/lib/password.ts`:

```typescript
import {
  useMutation,
  type UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import { sessionQueryKey } from "@/contexts/SessionContext";
import { apiClient } from "@/lib/apiClient";
import type { SessionPayload } from "@/types/api";

const passwordPath = "/password";

export interface PasswordReset {
  token: string;
  password: string;
  passwordConfirmation: string;
}

/**
 * Ask for reset instructions.
 *
 * Always resolves for a well-formed request, whether or not the address is
 * registered — the API deliberately will not say which (see the M10 design
 * doc), so the screen must not promise the caller that mail is on its way to
 * an account that exists.
 */
export function requestPasswordReset(email: string): Promise<unknown> {
  return apiClient.post(passwordPath, { email });
}

/**
 * Complete a reset. Devise signs the user in on success, so this answers with
 * the session payload and priming the cache from it logs them in everywhere
 * without a refetch — the same move lib/auth.ts makes after login.
 */
export function useResetPassword(): UseMutationResult<
  SessionPayload,
  Error,
  PasswordReset
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reset: PasswordReset) =>
      apiClient.put<SessionPayload>(passwordPath, {
        token: reset.token,
        password: reset.password,
        password_confirmation: reset.passwordConfirmation,
      }),
    onSuccess: (session) => {
      queryClient.setQueryData(sessionQueryKey, session);
    },
  });
}
```

- [ ] **Step 5: Write the two screens**

Read `app/views/devise/passwords/new.html.erb` and `edit.html.erb`, and `app/frontend/components/auth/LoginForm.tsx` for the form idiom (`useId`, react-bootstrap `Form.Group`, the error alert).

`PasswordNew.tsx` — email field, submit, then a confirmation message. **The message must not reveal whether the address is registered:**

```tsx
        <p>
          If that address is registered, we've sent reset instructions to it.
          Please check your inbox, and your spam folder.
        </p>
```

Wrap both screens in `<RequireLoggedOut>`, mirroring the API's `reject_when_logged_in!`.

`PasswordEdit.tsx` — reads the token from the query string with `useSearchParams()`:

```tsx
  const [searchParams] = useSearchParams();
  // Devise's mailer spells it reset_password_token, and the mailer is never
  // edited, so this is the name that arrives.
  const token = searchParams.get("reset_password_token") ?? "";
```

With no token, render the "invalid or expired link" state and a link to `spaPaths.passwordNew` rather than a broken form. On success, `<Navigate to={postAuthPath(session)} replace />` — the user is now signed in.

Map `ApiError.code === "invalid_token"` to the expired-link message and offer a fresh request; map `validation_failed` to per-field errors from `error.fields`.

- [ ] **Step 6: Write the screen tests**

`PasswordNew.test.tsx`: renders the form; submitting calls `requestPasswordReset` with the typed address; the confirmation message appears and **does not** say the account exists; a failed request surfaces an error rather than the confirmation.

`PasswordEdit.test.tsx`: renders both password fields when a token is present; submitting sends the token; `invalid_token` renders the expired-link message with a link to `spaPaths.passwordNew`; `validation_failed` renders the field errors; a missing `reset_password_token` renders the expired-link state and no form.

Use `MemoryRouter initialEntries={["/app/password/edit?reset_password_token=a-token"]}` to supply the token.

- [ ] **Step 7: Add the routes to the table**

In `app/frontend/app/App.tsx`, import both pages and add:

```tsx
                  <Route path={spaPaths.passwordNew} element={<PasswordNew />} />
                  <Route path={spaPaths.passwordEdit} element={<PasswordEdit />} />
```

- [ ] **Step 8: Run the tests to verify they pass**

```bash
corepack yarn test password; echo "EXIT=$?"
corepack yarn lint:fix; echo "EXIT=$?"
corepack yarn typecheck; echo "EXIT=$?"
corepack yarn test; echo "EXIT=$?"
```

Expected: all `EXIT=0`.

- [ ] **Step 9: Drive it by hand with a real token**

```bash
foreman start -f Procfile.dev
```

Request a reset at `http://localhost:3000/app/password/new` for a seeded account, find the token in the Rails log's mailer output, and open `http://localhost:3000/app/password/edit?reset_password_token=<token>`. Confirm the new password works, and that the old one does not.

- [ ] **Step 10: Commit**

```bash
git add app/frontend/lib/password.ts app/frontend/lib/password.test.tsx \
        app/frontend/pages/PasswordNew.tsx app/frontend/pages/PasswordNew.test.tsx \
        app/frontend/pages/PasswordEdit.tsx app/frontend/pages/PasswordEdit.test.tsx \
        app/frontend/lib/spaPaths.ts app/frontend/app/App.tsx config/routes.rb
git commit -m "Port the password reset screens to React

The token screen reads reset_password_token from the query string, which
is the name Devise's mailer sends and which the mailer keeps sending —
/users/password/edit stays HAML until cutover, so links already in
people's inboxes keep working.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: The account deletion screens

**Files:**
- Create: `app/frontend/lib/account.ts`, `app/frontend/lib/account.test.tsx`
- Create: `app/frontend/pages/ConfirmAccountDeletion.tsx`, `ConfirmAccountDeletion.test.tsx`
- Create: `app/frontend/pages/AccountDeleted.tsx`, `AccountDeleted.test.tsx`
- Modify: `app/frontend/lib/spaPaths.ts`, `config/routes.rb`, `app/frontend/app/App.tsx`

**Interfaces:**
- Consumes: `DELETE /api/v1/user` (Task 3); `RequireLogin`; `useSession`.
- Produces: `spaPaths.confirmAccountDeletion` (`"/app/account/delete"`), `spaPaths.accountDeleted` (`"/app/account/deleted"`); `useDeleteAccount()` from `@/lib/account`. Read by Task 6.

Cutover maps these onto `/confirm_account_deletion` and `/account_deleted` — note that in `spaPaths.ts` too.

- [ ] **Step 1: Add the paths and routes**

`spaPaths.ts`:

```typescript
  confirmAccountDeletion: "/app/account/delete",
  accountDeleted: "/app/account/deleted",
```

`config/routes.rb`, in the M10 block:

```ruby
  get "app/account/delete", to: "spa#index"
  get "app/account/deleted", to: "spa#index"
```

- [ ] **Step 2: Write the failing test for the mutation**

Create `app/frontend/lib/account.test.tsx`, modelled on `password.test.tsx` above:

```tsx
  it("deletes the account and primes the signed-out session", async () => {
    const destroy = vi
      .spyOn(apiClient, "delete")
      .mockResolvedValue(loggedOutSession);
    const { result } = renderHook(() => useDeleteAccount(), { wrapper });

    result.current.mutate();

    await waitFor(() => {
      expect(destroy).toHaveBeenCalledWith("/user");
    });
    expect(result.current.data?.currentUser).toBeNull();
  });
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
corepack yarn test account; echo "EXIT=$?"
```

Expected: FAIL — `@/lib/account` does not exist.

- [ ] **Step 4: Write the mutation**

Create `app/frontend/lib/account.ts`, following `lib/vote.ts`:

```typescript
const userPath = "/user";

/**
 * Delete the logged-in account, permanently.
 *
 * The server tears down the swap and emails the partner (User and Swap both
 * have before_destroy hooks), so there is nothing to do here but prime the
 * now-signed-out session so the chrome stops showing a logged-in user.
 */
export function useDeleteAccount(): UseMutationResult<SessionPayload, Error, void> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.delete<SessionPayload>(userPath),
    onSuccess: (session) => {
      queryClient.setQueryData(sessionQueryKey, session);
    },
  });
}
```

- [ ] **Step 5: Write the screens**

`ConfirmAccountDeletion.tsx` ports `app/views/static_pages/confirm_account_deletion.html.haml` (5 lines). Inside `<RequireLogin>`:

- The warning prose, verbatim from the HAML.
- A `<Button variant="danger">` — **not** the legacy `link_to … style: "color: red"`. A destructive action is a button, and a red inline style is not a treatment.
- Disabled with an explanation when `session.flags.votingInfoLocked`, mirroring the server's `voting_info_locked` refusal.
- A way out — a `<Link to={spaPaths.profile}>` cancel.
- On success, `<Navigate to={spaPaths.accountDeleted} replace />`. `replace` matters: Back must not return to a confirmation page for an account that no longer exists.

`AccountDeleted.tsx` ports `account_deleted.html.haml` (3 lines) — the confirmation sentence, verbatim. **No `RequireLogin`**: by the time anyone sees it they are signed out by design.

- [ ] **Step 6: Write the screen tests**

`ConfirmAccountDeletion.test.tsx`: the warning renders; the confirm button calls the mutation; a successful delete navigates to `spaPaths.accountDeleted`; the button is disabled and the reason shown when `votingInfoLocked`; a `voting_info_locked` API error surfaces rather than navigating.

`AccountDeleted.test.tsx`: renders the confirmation, and renders for a logged-out session without redirecting.

- [ ] **Step 7: Add the routes to the table and verify**

Add both to `App.tsx`, then:

```bash
corepack yarn lint:fix; echo "EXIT=$?"
corepack yarn typecheck; echo "EXIT=$?"
corepack yarn test; echo "EXIT=$?"
```

Expected: all `EXIT=0`.

- [ ] **Step 8: Drive it by hand**

With the stack running, create a throwaway account, give it a swap, then delete it from `/app/account/delete`. Confirm: the partner's swap is gone, the partner received a cancellation email (check the Rails log), the nav no longer shows a user, and `/app/account/deleted` renders.

- [ ] **Step 9: Commit**

```bash
git add app/frontend/lib/account.ts app/frontend/lib/account.test.tsx \
        app/frontend/pages/ConfirmAccountDeletion.tsx \
        app/frontend/pages/ConfirmAccountDeletion.test.tsx \
        app/frontend/pages/AccountDeleted.tsx \
        app/frontend/pages/AccountDeleted.test.tsx \
        app/frontend/lib/spaPaths.ts app/frontend/app/App.tsx config/routes.rb
git commit -m "Port the account deletion screens to React

The confirmation is a danger button rather than the legacy red inline-styled
link, and it is disabled once voting is open and the swap is confirmed —
mirroring the server guard the legacy controller enforced by redirecting
silently.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Repoint the last three legacy links, and stop this recurring

M6 and M8 each shipped believing they had fixed the last SPA link pointing at a replaced HAML screen. Both were wrong, because the component tests asserted the buggy hrefs — the suite agreed with the bug. This task fixes the three remaining links **and** adds the check that does not depend on anyone remembering.

**Files:**
- Modify: `app/frontend/components/auth/LoginForm.tsx:17,79`
- Modify: `app/frontend/components/auth/LoginForm.test.tsx:87-92`
- Modify: `app/frontend/components/profile/ProfileForm.tsx:39,219`
- Modify: `app/frontend/components/profile/ProfileForm.test.tsx`
- Modify: `app/frontend/components/static/Faq.tsx` (the `#deactivate` link M9 left)
- Modify: `app/frontend/components/static/Faq.test.tsx`
- Create: `playwright-tests/no-legacy-links.spec.ts`

**Interfaces:**
- Consumes: `spaPaths.passwordNew` (Task 4), `spaPaths.confirmAccountDeletion` (Task 5).
- Produces: nothing.

- [ ] **Step 1: Find them all**

```bash
grep -rn 'href="/users/password\|href="/confirm_account_deletion\|href="/account_deleted' app/frontend/; echo "EXIT=$?"
```

Expected: the three sites above. Work from this output, not from memory.

- [ ] **Step 2: Update the tests first**

`LoginForm.test.tsx` — rename the example and change the expectation:

```tsx
  it("links to the password reset screen, staying in the SPA", () => {
    renderForm();

    expect(
      screen.getByRole("link", { name: /forgotten password/i }),
    ).toHaveAttribute("href", spaPaths.passwordNew);
  });
```

Do the same for `ProfileForm.test.tsx`'s delete-account link and `Faq.test.tsx`'s `#deactivate` link, expecting `spaPaths.confirmAccountDeletion`.

- [ ] **Step 3: Run the tests to verify they fail**

```bash
corepack yarn test; echo "EXIT=$?"
```

Expected: FAIL in all three — each still renders the legacy href.

- [ ] **Step 4: Repoint the components**

Replace the module constants and the anchors:

```tsx
// LoginForm.tsx — delete `const hamlForgottenPassword = "/users/password/new";`
<Link to={spaPaths.passwordNew}>Forgotten password?</Link>
```

```tsx
// ProfileForm.tsx — delete `const hamlDeleteAccount = "/confirm_account_deletion";`
<Link to={spaPaths.confirmAccountDeletion}>delete your account</Link>
```

```tsx
// Faq.tsx — replace the <a> M9 left behind, and delete its "M10 owns this" comment
<Link to={spaPaths.confirmAccountDeletion}>permanently remove your account</Link>
```

Also update `LoginForm.tsx`'s docstring, which says "Password reset stays on HAML".

- [ ] **Step 5: Write the guard test**

Create `playwright-tests/no-legacy-links.spec.ts`:

```typescript
import { expect, test } from "@playwright/test";
import { spaPaths } from "@/lib/spaPaths";
import { signIn } from "./support/auth";
import { seedProfileUser } from "./support/seedProfileUser";

// Every canonical path a ported screen replaced. A link to one of these from
// inside the SPA drops the user into the Bootstrap 4 HAML site with no way
// back — the bug M6 and M8 each shipped believing they had just fixed, both
// times because the component tests asserted the buggy href.
//
// This test does not have to be told which links to check, which is the only
// version of it that keeps holding as screens are added.
const replacedByTheSpa = [
  "/faq",
  "/api",
  "/about",
  "/contact",
  "/terms",
  "/cookies",
  "/user/edit",
  "/user/swap",
  "/user/vote",
  "/user/share",
  "/users/sign_in",
  "/users/sign_up",
  "/users/password/new",
  "/users/password/edit",
  "/confirm_account_deletion",
  "/account_deleted",
];

function isLegacy(href: string): boolean {
  const path = href.split("?")[0].split("#")[0].replace(/\/$/, "");
  return replacedByTheSpa.includes(path);
}

const loggedOutPages = [
  spaPaths.home,
  spaPaths.login,
  spaPaths.signup,
  spaPaths.about,
  spaPaths.contact,
  spaPaths.terms,
  spaPaths.cookies,
  spaPaths.faq,
  spaPaths.api,
  spaPaths.passwordNew,
];

for (const path of loggedOutPages) {
  test(`must not link out to a replaced HAML path from ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("main")).not.toBeEmpty();

    const hrefs = await page.locator("a[href]").evaluateAll((links) =>
      links.map((link) => link.getAttribute("href") ?? ""),
    );

    expect(hrefs.filter(isLegacy)).toEqual([]);
  });
}

test("must not link out to a replaced HAML path from the signed-in screens", async ({
  page,
}) => {
  // seedProfileUser is synchronous — it returns TestCredentials, not a promise.
  const user = seedProfileUser();
  await signIn(page, user);

  for (const path of [spaPaths.profile, spaPaths.dashboard, spaPaths.mobile]) {
    await page.goto(path);
    await expect(page.getByRole("main")).not.toBeEmpty();

    const hrefs = await page.locator("a[href]").evaluateAll((links) =>
      links.map((link) => link.getAttribute("href") ?? ""),
    );

    expect(hrefs.filter(isLegacy), `on ${path}`).toEqual([]);
  }
});
```

`seedProfileUser(suffix = "")` returns `TestCredentials` synchronously and `signIn(page, credentials)` is async — check both against `playwright-tests/support/` before adapting. Drop `/` from the list: the SPA home is `spaPaths.home` and a link to `/` is the legacy home that log-out deliberately uses.

- [ ] **Step 6: Run everything**

```bash
corepack yarn test; echo "EXIT=$?"
corepack yarn lint:fix; echo "EXIT=$?"
corepack yarn typecheck; echo "EXIT=$?"
corepack yarn e2e no-legacy-links; echo "EXIT=$?"
```

Expected: all `EXIT=0`. **If the guard test finds links this plan did not list, that is the test working** — report them rather than trimming the list to make it pass.

- [ ] **Step 7: Commit**

```bash
git add app/frontend/ playwright-tests/no-legacy-links.spec.ts
git commit -m "Keep the last legacy links inside the SPA, and test for the rest

Password reset, account deletion and the FAQ's deactivate link were the
last three. Adds a Playwright guard that crawls every ported screen for
links to paths the SPA has replaced, so this stops depending on anyone
remembering — M6 and M8 both shipped believing they had fixed the last one.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: End-to-end and accessibility coverage

**Files:**
- Create: `playwright-tests/password-reset.spec.ts`
- Create: `playwright-tests/account-deletion.spec.ts`
- Modify: `playwright-tests/accessibility.spec.ts`

- [ ] **Step 1: Find how to read a sent email in tests**

```bash
grep -rn "deliveries\|letter_opener\|mailer" playwright-tests/ spec/rails_helper.rb config/environments/development.rb | head -20
```

The reset round-trip needs the token from the email. If nothing exists, the simplest reliable route is a development-only test hook mirroring `MESSAGEBIRD_FAKE_OTP` (which M6 established: allowed in development and test, refused everywhere else including production) — for example reading the most recent `reset_password_token` for a known address. **Do not** loosen the token model itself.

- [ ] **Step 2: Write the reset E2E**

Request a reset for a seeded account at `spaPaths.passwordNew`; assert the confirmation message appears and does not confirm the account exists; obtain the token; visit `${spaPaths.passwordEdit}?reset_password_token=<token>`; set a new password; assert the nav shows the user as signed in; sign out; assert the new password logs in and the old one does not.

- [ ] **Step 3: Write the deletion E2E**

Seed a confirmed swap pair with `seedConfirmedSwapPair` (`playwright-tests/support/seedProfileUser.ts`). Sign in as the chooser, delete from `spaPaths.confirmAccountDeletion`, assert the landing on `spaPaths.accountDeleted`, that the nav shows a signed-out user, and that signing in as the partner shows no swap.

- [ ] **Step 4: Add the accessibility entries**

Add `spaPaths.passwordNew` and `spaPaths.accountDeleted` to `migratedPages` in `accessibility.spec.ts` (both render logged-out). Scan `spaPaths.confirmAccountDeletion` in the signed-in block, and `spaPaths.passwordEdit` with a token in the query string.

- [ ] **Step 5: Run the E2E suite**

```bash
corepack yarn e2e; echo "EXIT=$?"
```

Expected: PASS. Check any failure against `master` before assuming it is yours — see issue #1074 for known flakiness.

- [ ] **Step 6: Commit**

```bash
git add playwright-tests/
git commit -m "Cover password reset and account deletion end to end

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Update the plan document

**Files:**
- Modify: `docs/frontend-modernization-plan.md`

- [ ] **Step 1: Add the M10 entry**

Insert an **M10 — Account lifecycle** bullet after M9, in the established style: what landed at which paths, the three endpoints, the always-202 divergence and why, the mailer coexistence, what stays live in HAML, and what covers it.

- [ ] **Step 2: Correct M5's claim**

M5 says "Password reset stays on HAML." Append: *(until M10, which ported both screens; `/users/password/*` keep serving Devise HAML until cutover so already-sent reset links keep working.)*

- [ ] **Step 3: Record that porting is finished**

Under **M11 — Cutover**, note that every user-facing screen now has a React replacement, and that cutover is gated on the SEO question (risk 6) and E2E flakiness ([#1074](https://github.com/swapmyvote/swapmyvote/issues/1074)) — plus a full regression pass, since master moved from Rails 6.1 to 8.1.3.1 (#1069–#1071) during this work.

Add the cutover path mapping from the design doc, so M11 does not have to infer it:

| `spaPaths` | canonical path |
|---|---|
| `/app/password/new` | `/users/password/new` |
| `/app/password/edit` | `/users/password/edit` |
| `/app/account/delete` | `/confirm_account_deletion` |
| `/app/account/deleted` | `/account_deleted` |

- [ ] **Step 4: Commit**

```bash
git add docs/frontend-modernization-plan.md
git commit -m "Record M10 and note that porting is complete

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Done when

- `/app/password/new`, `/app/password/edit`, `/app/account/delete` and `/app/account/deleted` all render; `/users/password/*`, `/confirm_account_deletion` and `/account_deleted` still serve their current views unchanged.
- The Devise mailer is untouched, and a reset link from a real email still works.
- `POST /api/v1/password` answers 202 for a registered and an unregistered address alike.
- `DELETE /api/v1/user` is refused when voting is open and the swap is confirmed.
- `playwright-tests/no-legacy-links.spec.ts` passes.
- `corepack yarn lint`, `typecheck`, `test` and `bundle exec rspec` all exit 0.
- `corepack yarn e2e` is no worse than on `master` (see #1074).
