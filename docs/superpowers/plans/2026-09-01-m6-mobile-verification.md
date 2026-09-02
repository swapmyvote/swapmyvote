# M6 Mobile Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a logged-in user verify their mobile number entirely inside the React SPA, at `/app/mobile`, without the legacy HAML mobile pages or the `intlTelInput.js` entrypoint changing at all.

**Architecture:** Two new JSON endpoints in the existing `/api/v1` namespace — `POST /api/v1/mobile_phone/verifications` (send an OTP) and `POST /api/v1/mobile_phone/verifications/confirm` (check the code) — ported from `MobilePhoneController`, with its `require_login` / `require_swapping_open` guards becoming status codes and its `verify_failure_reason` mapping becoming error codes. On the client, `react-phone-number-input` replaces the jQuery `intl-tel-input` widget and `libphonenumber-js` makes the legacy `MOBILE` / `FIXED_LINE_OR_MOBILE` check a pure, unit-testable function. A fake OTP driver behind an env flag lets Playwright drive the real controller path with no MessageBird key.

**Tech Stack:** Rails 6.1, `messagebird-rest` 3.1, Alba serializers, RSpec request specs; React 19 + TypeScript, react-bootstrap, react-router v7, `react-phone-number-input` 3.4 + `libphonenumber-js` 1.13, Vitest + React Testing Library, Playwright + axe.

**Design:** [`docs/superpowers/specs/2026-09-01-m6-mobile-verification-design.md`](../specs/2026-09-01-m6-mobile-verification-design.md)

## Global Constraints

- **No canonical route flips.** `/user/edit`, `/mobile_phone/verify_create`, `/mobile_phone/verify_token` and `/admin/verify_mobile` keep serving HAML and keep working. React ships behind `/app/*` only. Do not edit `app/controllers/mobile_phone_controller.rb`, `app/views/mobile_phone/`, `app/views/users/edit.html.haml`, `app/views/admin/verify_mobile.html.haml` or `app/frontend/entrypoints/intlTelInput.js`.
- **Keep the two route tables in lockstep.** Every path added to `app/frontend/lib/spaPaths.ts` needs a matching `get "app/…", to: "spa#index"` in `config/routes.rb` and a matching `<Route>` in `app/frontend/app/App.tsx`.
- **TypeScript style:** always use braces in `if`/`else`/`for`/`while` bodies, even for a single statement.
- **Constants are camelCase**, never `SCREAMING_SNAKE_CASE`.
- **Styling:** Bootstrap utility classes over custom CSS. No inline `style={{…}}` unless the value is genuinely dynamic.
- **Form layout:** labels and fields left-aligned, one field per row. Centring is for hero copy only.
- **UI copy:** a single-sentence string has no trailing full stop; multi-sentence copy keeps its punctuation. The exception is a message quoted verbatim from the legacy site or rendered by the API — those keep their original punctuation so both live sites say the same thing.
- **Server is authoritative.** Every client-side guard is UX only; each endpoint re-checks its own gates.
- **Quality gates before every commit:** `corepack yarn lint:fix`, `corepack yarn typecheck`, `corepack yarn test`, and `bundle exec rspec` when Ruby changed. All must pass.
- **Ruby commands need the pinned Ruby:** prefix with `PATH="$HOME/.rbenv/shims:$PATH"`.

---

### Task 1: `POST /api/v1/mobile_phone/verifications` — send a code

> **Amended during execution (2026-09-01).** Step 5's `create` assigns the
> number before asking MessageBird to send, which is unsafe: `User#mobile_number=`
> destroys the existing row and commits its replacement in its own transaction,
> so a transient send failure during a number change leaves an already-verified
> user with no number at all. The implemented version **sends first and persists
> second** — guards, then an explicit uniqueness query (422 before any SMS goes
> out), then the send, then the assignment and `verify_id`. `request_otp`'s
> `phone.destroy!` clean-up is gone: a failed send now mutates nothing. Status
> codes, error codes and user-facing strings are unchanged. See the amended
> "Failure clean-up" section of the design doc, and the ledger entry.

**Files:**
- Create: `app/controllers/api/v1/mobile_phone_verifications_controller.rb`
- Modify: `app/controllers/api/v1/base_controller.rb`
- Modify: `app/serializers/api/v1/user_serializer.rb`
- Modify: `config/routes.rb`
- Test: `spec/requests/api/v1/mobile_phone_verifications_spec.rb`

**Interfaces:**
- Consumes: `Api::V1::BaseController#require_logged_in!` and `#render_error(code:, status:, messages:, fields:)`, both already private on the base controller; `Api::V1::SessionPayload#session_payload`, already a concern.
- Produces: `Api::V1::BaseController#require_swapping_open!` (private, renders 403 `swapping_closed`) for Task 2 and for M7. `POST /api/v1/mobile_phone/verifications` accepting `{ number }` (optional) and answering 200 `{ number, sent: true }`. `Api::V1::UserSerializer` gains a `mobileNumber` attribute, consumed by Tasks 5, 8 and 9.

- [ ] **Step 1: Write the failing request spec**

Create `spec/requests/api/v1/mobile_phone_verifications_spec.rb`:

```ruby
require "rails_helper"

RSpec.describe "Api::V1::MobilePhoneVerifications", type: :request do
  include Devise::Test::IntegrationHelpers

  def json
    JSON.parse(response.body)
  end

  def stub_mode(mode)
    allow(ENV).to receive(:[]).and_call_original
    allow(ENV).to receive(:[]).with("SWAPMYVOTE_MODE").and_return(mode)
  end

  # MessageBird reports every problem as a list of errors on one exception.
  # MessageBird::Error inherits MessageBird::Base, which assigns from a hash
  # of camelCase keys, so this is the real class the controller will see.
  def message_bird_error(code, description)
    MessageBird::ErrorException.new(
      [MessageBird::Error.new("code" => code, "description" => description)]
    )
  end

  let(:user) { create(:user, email: "voter@example.com") }
  let(:number) { "+447911123456" }
  let(:other_number) { "+447911123457" }
  let(:otp) { MessageBird::Verify.new("id" => "verify-1") }

  let(:path) { "/api/v1/mobile_phone/verifications" }

  context "when logged out" do
    it "401s" do
      post path, params: { number: number }, as: :json

      expect(response).to have_http_status(:unauthorized)
      expect(json["error"]["code"]).to eq "unauthenticated"
    end
  end

  context "when logged in" do
    before { sign_in user }

    it "403s while swapping is closed" do
      stub_mode("closed-warm-up")

      post path, params: { number: number }, as: :json

      expect(response).to have_http_status(:forbidden)
      expect(json["error"]["code"]).to eq "swapping_closed"
    end

    it "sends a code and stores the verification id" do
      expect(SwapMyVote::MessageBird)
        .to receive(:verify_create)
        .with(number, /Your verification code is %token/)
        .and_return(otp)

      post path, params: { number: number }, as: :json

      expect(response).to have_http_status(:ok)
      expect(json).to eq("number" => number, "sent" => true)
      phone = user.reload.mobile_phone
      expect(phone.number).to eq number
      expect(phone.verify_id).to eq "verify-1"
      expect(phone.verified).to be_falsey
    end

    it "re-sends to the number on file when none is given, retiring the old id" do
      user.create_mobile_phone!(number: number, verify_id: "verify-0")
      expect(SwapMyVote::MessageBird)
        .to receive(:verify_delete).with("verify-0")
      expect(SwapMyVote::MessageBird)
        .to receive(:verify_create).and_return(otp)

      post path, params: {}, as: :json

      expect(response).to have_http_status(:ok)
      expect(user.reload.mobile_phone.verify_id).to eq "verify-1"
    end

    it "422s when there is no number to send to" do
      post path, params: {}, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json["error"]["code"]).to eq "number_missing"
    end

    it "422s a number that is not in E.164 form" do
      post path, params: { number: "07911 123456" }, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json["error"]["code"]).to eq "invalid_number"
    end

    # MobilePhone validates uniqueness, and User#mobile_number= wraps its
    # destroy-and-create in a transaction, so the failure rolls back and this
    # account keeps the number it already had.
    it "422s a number that belongs to another account, leaving this one alone" do
      create(:user, name: "Jane").create_mobile_phone!(number: number)
      user.create_mobile_phone!(number: other_number)

      post path, params: { number: number }, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json["error"]["code"]).to eq "validation_failed"
      expect(user.reload.mobile_phone.number).to eq other_number
    end

    it "409s a pointless re-verification of the verified number" do
      user.create_mobile_phone!(number: number, verified: true)

      post path, params: { number: number }, as: :json

      expect(response).to have_http_status(:conflict)
      expect(json["error"]["code"]).to eq "already_verified"
    end

    it "409s a re-send when the number on file is already verified" do
      user.create_mobile_phone!(number: number, verified: true)

      post path, params: {}, as: :json

      expect(response).to have_http_status(:conflict)
      expect(json["error"]["code"]).to eq "already_verified"
    end

    # Changing a number is how it gets re-verified. /app/profile no longer
    # carries a number field, so refusing this would leave no way to do it.
    it "accepts a different number from a verified user" do
      user.create_mobile_phone!(number: other_number, verified: true)
      expect(SwapMyVote::MessageBird)
        .to receive(:verify_create).and_return(otp)

      post path, params: { number: number }, as: :json

      expect(response).to have_http_status(:ok)
      phone = user.reload.mobile_phone
      expect(phone.number).to eq number
      expect(phone.verified).to be_falsey
    end

    it "502s and drops the number when the SMS cannot be sent" do
      allow(Airbrake).to receive(:notify)
      allow(SwapMyVote::MessageBird)
        .to receive(:verify_create)
        .and_raise(message_bird_error(21, "Something went wrong"))

      post path, params: { number: number }, as: :json

      expect(response).to have_http_status(:bad_gateway)
      expect(json["error"]["code"]).to eq "sms_send_failed"
      expect(user.reload.mobile_phone).to be_nil
    end
  end

  describe "the user serializer" do
    before { sign_in user }

    it "reports the number in the session payload" do
      user.create_mobile_phone!(number: number)

      get "/api/v1/session"

      expect(json["currentUser"]).to include("mobileNumber" => number)
    end

    it "reports a null number when there is none" do
      get "/api/v1/session"

      expect(json["currentUser"]).to include("mobileNumber" => nil)
    end
  end
end
```

- [ ] **Step 2: Run the spec to verify it fails**

Run: `PATH="$HOME/.rbenv/shims:$PATH" bundle exec rspec spec/requests/api/v1/mobile_phone_verifications_spec.rb`
Expected: FAIL — no route matches `/api/v1/mobile_phone/verifications`.

- [ ] **Step 3: Add the swapping-open guard to the base controller**

In `app/controllers/api/v1/base_controller.rb`, add this private method immediately after `require_logins_open!`:

```ruby
      # Mirrors ApplicationController#require_swapping_open, which redirects to
      # the home page. The first gate on a mutation endpoint; M7's swap
      # endpoints reuse it.
      def require_swapping_open!
        return if swapping_open?

        render_error(
          code: "swapping_closed",
          status: :forbidden,
          messages: ["Swapping is closed at the moment"]
        )
      end
```

- [ ] **Step 4: Add the number to the user serializer**

In `app/serializers/api/v1/user_serializer.rb`, add this attribute immediately after the `mobile_set_but_not_verified` block:

```ruby
      # The number itself, so the React verification form can start from it
      # and the profile screen can show which number is on the account. Only
      # ever serialized for the user themselves.
      attribute :mobile_number do |user|
        user.mobile_number
      end
```

- [ ] **Step 5: Write the controller**

Create `app/controllers/api/v1/mobile_phone_verifications_controller.rb`:

```ruby
module Api
  module V1
    # Mobile-number verification, ported from MobilePhoneController.
    #
    #   POST /api/v1/mobile_phone/verifications         — send an OTP by SMS
    #   POST /api/v1/mobile_phone/verifications/confirm — check the code
    #
    # The legacy controller's two before_actions (require_login,
    # require_swapping_open) are mirrored here as guards that report their
    # refusal instead of redirecting, and its flash-and-redirect_back failure
    # paths become the shared JSON error convention.
    class MobilePhoneVerificationsController < BaseController
      include SessionPayload

      # The legacy server trusts whatever intl-tel-input put in the hidden
      # field. A JSON endpoint is callable without the widget, so check the
      # shape at least. The "is it a mobile?" check stays client-side: it
      # needs libphonenumber metadata we do not load server-side.
      E164 = /\A\+[1-9]\d{6,14}\z/.freeze

      SMS_TEMPLATE = "Your verification code is %token. " \
                     "Please enter this code as prompted on the " \
                     "SwapMyVote website.".freeze

      before_action :require_logged_in!
      before_action :require_swapping_open!

      def create
        number = params[:number].presence

        return render_already_verified if pointless_reverification?(number)
        return render_number_missing if number.nil? && phone.nil?
        return render_invalid_number if number && !number.match?(E164)

        # RecordInvalid from the uniqueness validation is caught by
        # BaseController's rescue_from, and User#mobile_number='s transaction
        # rolls back, so the account keeps the number it had.
        current_user.mobile_number = number if number && number != phone&.number

        send_verification
      end

      private

      # A verified user re-sending to the number they already verified has
      # nothing to gain. A *different* number is a real change, and is
      # allowed: it is how a number gets replaced now that the React profile
      # screen has no number field.
      def pointless_reverification?(number)
        return false unless phone&.verified

        number.nil? || number == phone.number
      end

      def send_verification
        otp = request_otp
        return if performed?

        delete_previous_verify_id if phone.verify_id
        phone.update!(verify_id: otp.id)

        render json: { number: phone.number, sent: true }
      end

      def request_otp
        SwapMyVote::MessageBird.verify_create(phone.number, SMS_TEMPLATE)
      rescue MessageBird::ErrorException => ex
        notify_error_exception(
          ex, "Failed to send verification code to #{phone.number}"
        )
        # Nothing can be done with a number we cannot send to, and leaving it
        # on the account makes it look verifiable. The legacy controller nils
        # the number instead, which MobilePhone's own uniqueness validation
        # can silently refuse once another row already has a nil number.
        phone.destroy!
        render_error(
          code: "sms_send_failed",
          status: :bad_gateway,
          messages: ["Sorry, I couldn't send you a verification SMS! " \
                     "Please try again later."]
        )
        nil
      end

      # Ported from MobilePhoneController#delete_previous_verify_id: a verify
      # object that has already gone is not a problem worth reporting.
      def delete_previous_verify_id
        SwapMyVote::MessageBird.verify_delete(phone.verify_id)
      rescue MessageBird::ErrorException => ex
        return if verify_object_missing?(ex)

        notify_error_exception(ex, "verify_delete(#{phone.verify_id}) failed")
      end

      def verify_object_missing?(ex)
        return false unless ex.errors.length == 1

        error = ex.errors.first
        error.code == 20 && error.description =~ /Verify object could not be found/
      end

      def render_already_verified
        render_error(
          code: "already_verified",
          status: :conflict,
          messages: ["Your mobile phone number has already been verified."]
        )
      end

      def render_number_missing
        render_error(
          code: "number_missing",
          status: :unprocessable_entity,
          messages: ["Please enter your mobile phone number before you swap"]
        )
      end

      def render_invalid_number
        render_error(
          code: "invalid_number",
          status: :unprocessable_entity,
          messages: ["That doesn't look like a phone number."]
        )
      end

      # Ported verbatim from MobilePhoneController, minus the flash.
      def notify_error_exception(ex, action)
        ex.errors.each { |error| notify_error(error) }
        msg = action + ":\n" + ex.errors.map { |e| error_message(e) }.join("\n")
        logger.error(msg)
      end

      def notify_error(error)
        Airbrake.notify(
          error_message(error), {
            code: error.code,
            description: error.description,
            parameter: error.parameter
          }
        )
      end

      def error_message(error)
        "Error code #{error.code}: #{error.description}"
      end

      def phone
        current_user.mobile_phone
      end
    end
  end
end
```

- [ ] **Step 6: Add the route**

In `config/routes.rb`, inside `namespace :api do namespace :v1 do`, add immediately after the `resource :pre_populate` line:

```ruby
      # Mobile-number verification (M6), ported from MobilePhoneController.
      # Its /mobile_phone/verify_* routes below keep serving HAML.
      scope :mobile_phone do
        resources :verifications, only: [:create],
                  controller: "mobile_phone_verifications" do
          post :confirm, on: :collection
        end
      end
```

The `confirm` action arrives in Task 2; routing to it now keeps the route block a single edit.

- [ ] **Step 7: Run the spec to verify it passes**

Run: `PATH="$HOME/.rbenv/shims:$PATH" bundle exec rspec spec/requests/api/v1/mobile_phone_verifications_spec.rb`
Expected: PASS — every example except the `confirm` ones, which do not exist yet.

- [ ] **Step 8: Run the whole backend suite and rubocop**

Run: `PATH="$HOME/.rbenv/shims:$PATH" bundle exec rspec && PATH="$HOME/.rbenv/shims:$PATH" bundle exec rubocop`
Expected: PASS. If rubocop complains about `Metrics/ClassLength` or `Metrics/MethodLength` on the new controller, add a targeted `# rubocop:disable` around the offending method with a one-line reason, matching how `admin_controller.rb` already handles it.

- [ ] **Step 9: Commit**

```bash
git add app/controllers/api/v1/mobile_phone_verifications_controller.rb app/controllers/api/v1/base_controller.rb app/serializers/api/v1/user_serializer.rb config/routes.rb spec/requests/api/v1/mobile_phone_verifications_spec.rb
git commit -m "Add POST /api/v1/mobile_phone/verifications"
```

---

### Task 2: `POST /api/v1/mobile_phone/verifications/confirm` — check the code

**Files:**
- Modify: `app/controllers/api/v1/mobile_phone_verifications_controller.rb`
- Test: `spec/requests/api/v1/mobile_phone_verifications_spec.rb`

**Interfaces:**
- Consumes: Task 1's controller, its `phone` / `notify_error_exception` private helpers, and `Api::V1::SessionPayload#session_payload`.
- Produces: `POST /api/v1/mobile_phone/verifications/confirm` accepting `{ token }` and answering 200 with the `GET /api/v1/session` payload, or 409/422/502 with a code from `already_verified`, `no_verification_pending`, `code_already_used`, `code_expired`, `code_incorrect`, `verification_failed`. Consumed by Task 5.

- [ ] **Step 1: Write the failing request spec**

Append this `describe` block to `spec/requests/api/v1/mobile_phone_verifications_spec.rb`, immediately before the `describe "the user serializer"` block:

```ruby
  describe "POST /api/v1/mobile_phone/verifications/confirm" do
    let(:confirm_path) { "/api/v1/mobile_phone/verifications/confirm" }

    context "when logged out" do
      it "401s" do
        post confirm_path, params: { token: "123456" }, as: :json

        expect(response).to have_http_status(:unauthorized)
        expect(json["error"]["code"]).to eq "unauthenticated"
      end
    end

    context "when logged in" do
      before { sign_in user }

      it "403s while swapping is closed" do
        stub_mode("closed-warm-up")

        post confirm_path, params: { token: "123456" }, as: :json

        expect(response).to have_http_status(:forbidden)
        expect(json["error"]["code"]).to eq "swapping_closed"
      end

      it "verifies the number and answers with the session payload" do
        user.create_mobile_phone!(number: number, verify_id: "verify-1")
        expect(SwapMyVote::MessageBird)
          .to receive(:verify_token).with("verify-1", "123456")

        post confirm_path, params: { token: "123456" }, as: :json

        expect(response).to have_http_status(:ok)
        expect(json["currentUser"]).to include(
          "mobileVerified" => true,
          "mobileSetButNotVerified" => false
        )
        phone = user.reload.mobile_phone
        expect(phone.verified).to be true
        expect(phone.verify_id).to be_nil
      end

      it "409s when no code has been sent" do
        user.create_mobile_phone!(number: number)

        post confirm_path, params: { token: "123456" }, as: :json

        expect(response).to have_http_status(:conflict)
        expect(json["error"]["code"]).to eq "no_verification_pending"
      end

      it "409s when there is no number at all" do
        post confirm_path, params: { token: "123456" }, as: :json

        expect(response).to have_http_status(:conflict)
        expect(json["error"]["code"]).to eq "no_verification_pending"
      end

      it "409s when the number is already verified" do
        user.create_mobile_phone!(number: number, verified: true)

        post confirm_path, params: { token: "123456" }, as: :json

        expect(response).to have_http_status(:conflict)
        expect(json["error"]["code"]).to eq "already_verified"
      end

      # MessageBird reports all three as error code 10 and tells them apart
      # only in the description, exactly as
      # MobilePhoneController#verify_failure_reason reads them.
      {
        "The token has already been processed" => "code_already_used",
        "The token has expired" => "code_expired",
        "The token is invalid" => "code_incorrect"
      }.each do |description, code|
        it "reports #{code} for '#{description}'" do
          user.create_mobile_phone!(number: number, verify_id: "verify-1")
          allow(SwapMyVote::MessageBird)
            .to receive(:verify_token)
            .and_raise(message_bird_error(10, description))

          post confirm_path, params: { token: "000000" }, as: :json

          expect(response).to have_http_status(:unprocessable_entity)
          expect(json["error"]["code"]).to eq code
          expect(json["error"]["messages"].first)
            .to end_with "Please use the code sent most recently."
          expect(user.reload.mobile_phone.verified).to be_falsey
        end
      end

      it "502s and notifies Airbrake for an unrecognised failure" do
        user.create_mobile_phone!(number: number, verify_id: "verify-1")
        expect(Airbrake).to receive(:notify)
        allow(SwapMyVote::MessageBird)
          .to receive(:verify_token)
          .and_raise(message_bird_error(2, "Request not allowed"))

        post confirm_path, params: { token: "000000" }, as: :json

        expect(response).to have_http_status(:bad_gateway)
        expect(json["error"]["code"]).to eq "verification_failed"
      end
    end

    context "with forgery protection on (as in production)" do
      around do |example|
        original = ActionController::Base.allow_forgery_protection
        ActionController::Base.allow_forgery_protection = true
        example.run
        ActionController::Base.allow_forgery_protection = original
      end

      before { sign_in user }

      it "rejects a confirm without a valid CSRF token, as JSON" do
        user.create_mobile_phone!(number: number, verify_id: "verify-1")

        post confirm_path,
             params: { token: "123456" },
             headers: { "X-CSRF-Token" => "not-the-token" },
             as: :json

        expect(response).to have_http_status(:unprocessable_entity)
        expect(json["error"]).to include("code" => "invalid_authenticity_token")
      end
    end
  end
```

- [ ] **Step 2: Run the spec to verify it fails**

Run: `PATH="$HOME/.rbenv/shims:$PATH" bundle exec rspec spec/requests/api/v1/mobile_phone_verifications_spec.rb -e "verifies the number"`
Expected: FAIL — `AbstractController::ActionNotFound` for `confirm`.

- [ ] **Step 3: Add the confirm action**

In `app/controllers/api/v1/mobile_phone_verifications_controller.rb`, add `confirm` immediately after `create`, before the `private` keyword:

```ruby
      def confirm
        return render_already_verified if phone&.verified
        return render_no_verification_pending if phone&.verify_id.blank?
        return unless check_token

        phone.update!(verified: true, verify_id: nil)

        # Answer with the whole session payload rather than 204: mobileVerified
        # and mobileSetButNotVerified both flip here, and returning them saves
        # the SPA a round trip before it can show the verified state. Not
        # render_session_payload — that also rotates the CSRF token, which is
        # only correct for endpoints that change who we are logged in as.
        render json: session_payload
      end
```

- [ ] **Step 4: Add the failure mapping**

In the same file, add these to the private section, immediately after `pointless_reverification?`:

```ruby
      # Ported from MobilePhoneController#verify_failure_reason. Order
      # matters: "already been processed" must be matched before the looser
      # /expired/ and /token is invalid/ patterns, as the legacy `case` does.
      FAILURE_REASONS = [
        [/token has already been processed/, "code_already_used",
         "This code has already been used."],
        [/expired/, "code_expired", "The code expired."],
        [/token is invalid/, "code_incorrect",
         "The code you entered was incorrect."]
      ].freeze

      def check_token
        SwapMyVote::MessageBird.verify_token(phone.verify_id, params[:token].to_s)
        true
      rescue MessageBird::ErrorException => ex
        render_verify_failure(ex)
        false
      end

      def render_verify_failure(ex)
        code, message = failure_reason(ex)

        if code.nil?
          notify_error_exception(ex, "Verifying number #{phone.number} failed")
          return render_error(
            code: "verification_failed",
            status: :bad_gateway,
            messages: ["Something went wrong when verifying your number."]
          )
        end

        render_error(
          code: code,
          status: :unprocessable_entity,
          messages: ["#{message} Please use the code sent most recently."]
        )
      end

      def failure_reason(ex)
        ex.errors.each do |error|
          next unless error.code == 10

          FAILURE_REASONS.each do |pattern, code, message|
            return [code, message] if error.description =~ pattern
          end
        end

        [nil, nil]
      end

      def render_no_verification_pending
        render_error(
          code: "no_verification_pending",
          status: :conflict,
          messages: ["We haven't sent you a code yet. Please request one."]
        )
      end
```

- [ ] **Step 5: Run the spec to verify it passes**

Run: `PATH="$HOME/.rbenv/shims:$PATH" bundle exec rspec spec/requests/api/v1/mobile_phone_verifications_spec.rb`
Expected: PASS, all examples.

- [ ] **Step 6: Run the whole backend suite and rubocop**

Run: `PATH="$HOME/.rbenv/shims:$PATH" bundle exec rspec && PATH="$HOME/.rbenv/shims:$PATH" bundle exec rubocop`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/controllers/api/v1/mobile_phone_verifications_controller.rb spec/requests/api/v1/mobile_phone_verifications_spec.rb
git commit -m "Add POST /api/v1/mobile_phone/verifications/confirm"
```

---

### Task 3: Fake OTP driver for dev and E2E

**Files:**
- Modify: `app/services/swap_my_vote/message_bird.rb`
- Modify: `Procfile.dev`
- Modify: `playwright.config.ts`
- Test: `spec/services/swap_my_vote/message_bird_spec.rb`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `SwapMyVote::MessageBird` honouring `ENV["MESSAGEBIRD_FAKE_OTP"]` outside production — `verify_create` returns a `MessageBird::Verify` with a fixed id, `verify_delete` is a no-op, and `verify_token` accepts only the flag's value and otherwise raises the same `MessageBird::ErrorException` the real API would. Consumed by Task 10.

- [ ] **Step 1: Write the failing spec**

Create `spec/services/swap_my_vote/message_bird_spec.rb`:

```ruby
require "rails_helper"

RSpec.describe SwapMyVote::MessageBird do
  def stub_fake_otp(value)
    allow(ENV).to receive(:[]).and_call_original
    allow(ENV).to receive(:[]).with("MESSAGEBIRD_FAKE_OTP").and_return(value)
  end

  describe "with MESSAGEBIRD_FAKE_OTP set" do
    before { stub_fake_otp("123456") }

    it "creates a verification without calling MessageBird" do
      expect(described_class).not_to receive(:client)

      otp = described_class.verify_create("+447911123456", "template")

      expect(otp.id).to be_present
    end

    it "ignores a delete" do
      expect(described_class).not_to receive(:client)

      expect { described_class.verify_delete("anything") }.not_to raise_error
    end

    it "accepts the fixed token" do
      expect(described_class).not_to receive(:client)

      expect { described_class.verify_token("id", "123456") }
        .not_to raise_error
    end

    # The same exception the real API raises for a wrong code, so the
    # controller's rescue and its reason-mapping are the ones under test in
    # an end-to-end run, not a parallel happy path.
    it "raises MessageBird's own invalid-token error for anything else" do
      expect { described_class.verify_token("id", "000000") }
        .to raise_error(MessageBird::ErrorException) do |ex|
          expect(ex.errors.first.code).to eq 10
          expect(ex.errors.first.description).to match(/token is invalid/)
        end
    end

    it "refuses to run in production" do
      allow(Rails).to receive(:env).and_return(
        ActiveSupport::StringInquirer.new("production")
      )

      expect { described_class.verify_create("+447911123456", "t") }
        .to raise_error(/MESSAGEBIRD_FAKE_OTP/)
    end
  end

  describe "without MESSAGEBIRD_FAKE_OTP" do
    before { stub_fake_otp(nil) }

    it "calls the real client" do
      client = instance_double(MessageBird::Client)
      allow(described_class).to receive(:client).and_return(client)
      expect(client).to receive(:verify_create).and_return(
        MessageBird::Verify.new("id" => "real-1")
      )

      expect(described_class.verify_create("+447911123456", "t").id)
        .to eq "real-1"
    end
  end
end
```

- [ ] **Step 2: Run the spec to verify it fails**

Run: `PATH="$HOME/.rbenv/shims:$PATH" bundle exec rspec spec/services/swap_my_vote/message_bird_spec.rb`
Expected: FAIL — `verify_create` tries to build a real client.

- [ ] **Step 3: Add the fake branch**

Replace the whole of `app/services/swap_my_vote/message_bird.rb` with:

```ruby
class SwapMyVote::MessageBird
  # Description MessageBird itself returns for a wrong code, matched by
  # Api::V1::MobilePhoneVerificationsController::FAILURE_REASONS.
  INVALID_TOKEN_DESCRIPTION = "The token is invalid.".freeze

  FAKE_VERIFY_ID = "fake-verify-id".freeze

  class << self
    def client
      @_client ||= MessageBird::Client.new(ENV["MESSAGEBIRD_API_KEY"])
    end

    def verify_create(mobile_number, template)
      return MessageBird::Verify.new("id" => FAKE_VERIFY_ID) if fake_otp

      otp = SwapMyVote::MessageBird.client.verify_create(
        mobile_number,
        originator: "SwapMyVote",
        timeout: 10 * 60,
        template: template
      )
      return otp
    end

    def verify_delete(verify_id)
      return if fake_otp

      SwapMyVote::MessageBird.client.verify_delete(verify_id)
    rescue NoMethodError => ex
      Rails.logger.warn "Bug in messagebird-rest gem:\n#{ex}\n" +
                        (ex.backtrace.join "\n")
    end

    def verify_token(verify_id, token)
      return fake_verify_token(token) if fake_otp

      SwapMyVote::MessageBird.client.verify_token(verify_id, token)
    end

    private

    # Dev and E2E have no MessageBird key, so an OTP journey cannot be driven
    # end to end against the real API. With this set, the SMS is skipped and
    # one fixed code is accepted — which is only ever safe away from real
    # users, hence the production refusal.
    def fake_otp
      token = ENV["MESSAGEBIRD_FAKE_OTP"]
      return nil if token.blank?

      if Rails.env.production?
        raise "MESSAGEBIRD_FAKE_OTP is set in production: refusing to accept " \
              "a fixed verification code"
      end

      token
    end

    def fake_verify_token(token)
      return true if token == fake_otp

      raise MessageBird::ErrorException.new(
        [MessageBird::Error.new("code" => 10,
                                "description" => INVALID_TOKEN_DESCRIPTION)]
      )
    end
  end
end
```

- [ ] **Step 4: Run the spec to verify it passes**

Run: `PATH="$HOME/.rbenv/shims:$PATH" bundle exec rspec spec/services/swap_my_vote/message_bird_spec.rb`
Expected: PASS.

- [ ] **Step 5: Set the flag for the dev and E2E stacks**

Replace `Procfile.dev` with:

```
# `bundle exec vite` rather than `bin/vite` so the Vite dev server starts
# regardless of how the Bundler binstubs were generated.
vite: bundle exec vite dev
# MESSAGEBIRD_FAKE_OTP skips the SMS and accepts one fixed code, so the mobile
# verification screen can be driven locally and by Playwright without a
# MessageBird key. SwapMyVote::MessageBird refuses it in production.
web: MESSAGEBIRD_FAKE_OTP=123456 bin/rails s -p 3000
```

- [ ] **Step 6: Document the fixed code where the E2E suite reads it**

In `playwright.config.ts`, replace the comment block above `export default defineConfig({` with:

```ts
// E2E + accessibility (axe) tests run against the Rails + Vite dev stack.
// `webServer` below boots it, but a stack you already have running is reused,
// so the usual local loop (`foreman start -f Procfile.dev` in one terminal,
// `yarn e2e` in another) still works. Foreman must be on PATH — it is
// installed as a standalone gem, not through the Gemfile.
//
// Procfile.dev sets MESSAGEBIRD_FAKE_OTP so the mobile verification spec can
// enter a known code (see fakeOtp in playwright-tests/support/otp.ts) instead
// of needing a MessageBird key.
//
// Current coverage is the M1 static pages, the M4/M5 signed-in screens and
// the M6 mobile verification journey. The full swap flow lands in M7.
```

- [ ] **Step 7: Run the whole backend suite and rubocop**

Run: `PATH="$HOME/.rbenv/shims:$PATH" bundle exec rspec && PATH="$HOME/.rbenv/shims:$PATH" bundle exec rubocop`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add app/services/swap_my_vote/message_bird.rb spec/services/swap_my_vote/message_bird_spec.rb Procfile.dev playwright.config.ts
git commit -m "Add a fake OTP driver for dev and E2E"
```

---

### Task 4: `lib/phone.ts` — the ported number validation

**Files:**
- Modify: `package.json`
- Create: `app/frontend/lib/phone.ts`
- Test: `app/frontend/lib/phone.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `phoneNumberProblem(value: string): string | null` — the message to show, or `null` when the number is an acceptable mobile. Consumed by Tasks 6 and 7.

- [ ] **Step 1: Install the two libraries**

Run: `corepack yarn add react-phone-number-input@^3.4.18 libphonenumber-js@^1.13.12`

`libphonenumber-js` is a transitive dependency of `react-phone-number-input`, but this module imports it directly, so it is declared directly. Both resolve the same `metadata.max.json`, so the max metadata is bundled once.

- [ ] **Step 2: Write the failing test**

Create `app/frontend/lib/phone.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { phoneNumberProblem } from "@/lib/phone";

// The two messages intlTelInput.js set as HTML5 custom validity, reproduced
// exactly so the React screen complains in the same words as the live site.
const notAPhoneNumber = "This doesn't look like a phone number";
const notAMobileNumber = "This doesn't look like a mobile phone number";

describe("phoneNumberProblem", () => {
  it("accepts a UK mobile number", () => {
    expect(phoneNumberProblem("+447911123456")).toBeNull();
  });

  // The legacy check accepts FIXED_LINE_OR_MOBILE as well as MOBILE, which is
  // what most North American numbers report.
  it("accepts a number whose type is fixed-line-or-mobile", () => {
    expect(phoneNumberProblem("+12025550123")).toBeNull();
  });

  it("rejects a valid UK landline as not a mobile", () => {
    expect(phoneNumberProblem("+442079460000")).toBe(notAMobileNumber);
  });

  it("rejects a number that does not parse", () => {
    expect(phoneNumberProblem("nonsense")).toBe(notAPhoneNumber);
  });

  it("rejects a country code on its own", () => {
    expect(phoneNumberProblem("+44")).toBe(notAPhoneNumber);
  });

  // Parses, but is not a number libphonenumber considers assignable.
  it("rejects a number outside any real range", () => {
    expect(phoneNumberProblem("+447700900123")).toBe(notAPhoneNumber);
  });

  it("rejects an empty value", () => {
    expect(phoneNumberProblem("")).toBe(notAPhoneNumber);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `corepack yarn test app/frontend/lib/phone.test.ts`
Expected: FAIL — cannot resolve `@/lib/phone`.

- [ ] **Step 4: Write the module**

Create `app/frontend/lib/phone.ts`:

```ts
import { parsePhoneNumberFromString } from "libphonenumber-js/max";

// The two messages app/frontend/entrypoints/intlTelInput.js sets with
// setCustomValidity, kept word for word: the legacy page and this one should
// complain identically until the legacy page retires at M9.
const notAPhoneNumber = "This doesn't look like a phone number";
const notAMobileNumber = "This doesn't look like a mobile phone number";

// intl-tel-input accepted a number whose type was MOBILE or
// FIXED_LINE_OR_MOBILE and rejected everything else. libphonenumber-js is the
// same library underneath — intl-tel-input's utils.js is a Closure-compiled
// build of it — so these are the same two constants, by name.
const mobileTypes = ["MOBILE", "FIXED_LINE_OR_MOBILE"];

/**
 * What is wrong with a phone number, or null when nothing is.
 *
 * `/max` metadata is what makes `getType()` available: the default (`min`)
 * build can tell valid from invalid but not one kind of number from another.
 *
 * `parsePhoneNumberFromString` returns undefined rather than throwing, so an
 * unparseable value needs no try/catch.
 */
export function phoneNumberProblem(value: string): string | null {
  if (value === "") {
    return notAPhoneNumber;
  }

  const parsed = parsePhoneNumberFromString(value);
  if (!parsed || !parsed.isValid()) {
    return notAPhoneNumber;
  }

  const type = parsed.getType();
  if (type === undefined || !mobileTypes.includes(type)) {
    return notAMobileNumber;
  }

  return null;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `corepack yarn test app/frontend/lib/phone.test.ts`
Expected: PASS, 7 examples.

- [ ] **Step 6: Run the other gates**

Run: `corepack yarn lint:fix && corepack yarn typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add package.json yarn.lock app/frontend/lib/phone.ts app/frontend/lib/phone.test.ts
git commit -m "Port the intl-tel-input number checks to lib/phone.ts"
```

---

### Task 5: API types, `lib/mobilePhone.ts` and the SPA path

**Files:**
- Modify: `app/frontend/types/api.ts`
- Modify: `app/frontend/lib/spaPaths.ts`
- Create: `app/frontend/lib/mobilePhone.ts`
- Test: `app/frontend/lib/mobilePhone.test.ts`

**Interfaces:**
- Consumes: Tasks 1 and 2's endpoints; `apiClient` from `@/lib/apiClient`.
- Produces: `sendVerification(number?: string): Promise<MobileVerificationSent>` and `confirmVerification(token: string): Promise<SessionPayload>`; the `MobileVerificationSent` type; `CurrentUser.mobileNumber: string | null`; `spaPaths.mobile === "/app/mobile"`. Consumed by Tasks 7, 8, 9 and 10.

- [ ] **Step 1: Write the failing test**

Create `app/frontend/lib/mobilePhone.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/lib/apiClient";
import { confirmVerification, sendVerification } from "@/lib/mobilePhone";
import { sessionPayload, testUser } from "@/test/sessionFixtures";

vi.mock("@/lib/apiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/apiClient")>();
  return { ...actual, apiClient: { ...actual.apiClient, post: vi.fn() } };
});

describe("sendVerification", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
    vi.mocked(apiClient.post).mockResolvedValue({
      number: "+447911123456",
      sent: true,
    });
  });

  it("posts the number", async () => {
    const sent = await sendVerification("+447911123456");

    expect(apiClient.post).toHaveBeenCalledWith(
      "/mobile_phone/verifications",
      { number: "+447911123456" },
    );
    expect(sent.number).toBe("+447911123456");
  });

  // The endpoint treats a missing number as "re-send to the one on file".
  it("posts an empty body when no number is given", async () => {
    await sendVerification();

    expect(apiClient.post).toHaveBeenCalledWith(
      "/mobile_phone/verifications",
      {},
    );
  });
});

describe("confirmVerification", () => {
  it("posts the token and returns the session payload", async () => {
    const payload = sessionPayload({ currentUser: testUser });
    vi.mocked(apiClient.post).mockReset();
    vi.mocked(apiClient.post).mockResolvedValue(payload);

    const session = await confirmVerification("123456");

    expect(apiClient.post).toHaveBeenCalledWith(
      "/mobile_phone/verifications/confirm",
      { token: "123456" },
    );
    expect(session).toEqual(payload);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `corepack yarn test app/frontend/lib/mobilePhone.test.ts`
Expected: FAIL — cannot resolve `@/lib/mobilePhone`.

- [ ] **Step 3: Add the types**

In `app/frontend/types/api.ts`, add `mobileNumber` to `CurrentUser`, immediately after `constituencyOnsId`:

```ts
  /** The number on the account, verified or not. Null when there is none. */
  mobileNumber: string | null;
```

and add this interface immediately after `ProfileUpdateResult`:

```ts
/** `POST /api/v1/mobile_phone/verifications` — an SMS code is on its way to
 *  `number`. Confirming it answers with a `SessionPayload` instead. */
export interface MobileVerificationSent {
  number: string;
  sent: true;
}
```

- [ ] **Step 4: Add the number to every `CurrentUser` literal**

`CurrentUser` has no optional fields, so each object literal of that type needs the new key or `tsc` fails. There are exactly three:

In `app/frontend/test/sessionFixtures.tsx`, add to `testUser`, immediately after `constituencyOnsId`:

```ts
  mobileNumber: "+447911123456",
```

In `app/frontend/components/auth/RequireLogin.test.tsx`, add the same line to its local `CurrentUser` literal, immediately after `mobileSetButNotVerified` (line 20).

In `app/frontend/components/profile/ProfileForm.test.tsx`, add the same line to its local `user` literal, immediately after `mobileSetButNotVerified` (line 33).

- [ ] **Step 5: Add the SPA path**

In `app/frontend/lib/spaPaths.ts`, add to the `spaPaths` object, after `review`:

```ts
  mobile: "/app/mobile",
```

- [ ] **Step 6: Write the module**

Create `app/frontend/lib/mobilePhone.ts`:

```ts
import { apiClient } from "@/lib/apiClient";
import type { MobileVerificationSent, SessionPayload } from "@/types/api";

const verificationsPath = "/mobile_phone/verifications";

/**
 * Ask for an SMS code. Omitting the number re-sends to the one already on the
 * account, which is what the legacy page's "re-sending" link does; passing a
 * different number replaces it and starts a fresh verification.
 */
export function sendVerification(
  number?: string,
): Promise<MobileVerificationSent> {
  return apiClient.post<MobileVerificationSent>(
    verificationsPath,
    number === undefined ? {} : { number },
  );
}

/**
 * Check the code. Answers with the whole session payload, because verifying
 * flips `mobileVerified` — so the caller can prime its session cache from the
 * response rather than racing a refetch.
 */
export function confirmVerification(token: string): Promise<SessionPayload> {
  return apiClient.post<SessionPayload>(`${verificationsPath}/confirm`, {
    token,
  });
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `corepack yarn test`
Expected: PASS, the whole suite — the three `CurrentUser` literals changed in Step 4 are read across several files.

- [ ] **Step 8: Run the other gates**

Run: `corepack yarn lint:fix && corepack yarn typecheck`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add app/frontend/types/api.ts app/frontend/lib/spaPaths.ts app/frontend/lib/mobilePhone.ts app/frontend/lib/mobilePhone.test.ts app/frontend/test/sessionFixtures.tsx
git commit -m "Add the mobile verification API client and types"
```

---

### Task 6: `PhoneNumberField` and `VerificationCodeField`

**Files:**
- Create: `app/frontend/components/mobile/PhoneNumberField.tsx`
- Create: `app/frontend/components/mobile/VerificationCodeField.tsx`
- Test: `app/frontend/components/mobile/PhoneNumberField.test.tsx`
- Test: `app/frontend/components/mobile/VerificationCodeField.test.tsx`

**Interfaces:**
- Consumes: `phoneNumberProblem` from Task 4 (used by the caller, not by these components — they take the message as a prop).
- Produces: `<PhoneNumberField value onChange problem disabled />` where `onChange: (value: string) => void` and `problem: string | null`; `<VerificationCodeField value onChange disabled />` where `onChange: (value: string) => void`. Both consumed by Task 7.

- [ ] **Step 1: Write the failing tests**

Create `app/frontend/components/mobile/PhoneNumberField.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PhoneNumberField } from "@/components/mobile/PhoneNumberField";

describe("PhoneNumberField", () => {
  it("labels the number input", () => {
    render(
      <PhoneNumberField value="" onChange={vi.fn()} problem={null} />,
    );

    expect(
      screen.getByLabelText("My mobile number is"),
    ).toBeInTheDocument();
  });

  it("gives the country selector an accessible name", () => {
    render(
      <PhoneNumberField value="" onChange={vi.fn()} problem={null} />,
    );

    expect(
      screen.getByRole("combobox", { name: "Country" }),
    ).toBeInTheDocument();
  });

  it("reports what the caller typed", async () => {
    const onChange = vi.fn();
    render(<PhoneNumberField value="" onChange={onChange} problem={null} />);

    await userEvent.type(
      screen.getByLabelText("My mobile number is"),
      "+447911123456",
    );

    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls.at(-1)?.[0]).toContain("447911123456");
  });

  it("shows the problem and marks the field invalid", () => {
    render(
      <PhoneNumberField
        value="+442079460000"
        onChange={vi.fn()}
        problem="This doesn't look like a mobile phone number"
      />,
    );

    const input = screen.getByLabelText("My mobile number is");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(
      screen.getByText("This doesn't look like a mobile phone number"),
    ).toBeInTheDocument();
  });

  it("says nothing when there is no problem", () => {
    render(
      <PhoneNumberField value="+447911123456" onChange={vi.fn()} problem={null} />,
    );

    expect(
      screen.getByLabelText("My mobile number is"),
    ).not.toHaveAttribute("aria-invalid");
  });
});
```

Create `app/frontend/components/mobile/VerificationCodeField.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { VerificationCodeField } from "@/components/mobile/VerificationCodeField";

describe("VerificationCodeField", () => {
  it("labels the input and constrains it to six digits", () => {
    render(<VerificationCodeField value="" onChange={vi.fn()} />);

    const input = screen.getByLabelText("The 6 digit code");
    expect(input).toHaveAttribute("maxLength", "6");
    expect(input).toHaveAttribute("pattern", "[0-9]{6}");
    expect(input).toHaveAttribute("inputMode", "numeric");
  });

  it("reports what was typed", async () => {
    const onChange = vi.fn();
    render(<VerificationCodeField value="" onChange={onChange} />);

    await userEvent.type(screen.getByLabelText("The 6 digit code"), "1");

    expect(onChange).toHaveBeenCalledWith("1");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `corepack yarn test app/frontend/components/mobile`
Expected: FAIL — neither module resolves.

- [ ] **Step 3: Write `PhoneNumberField`**

Create `app/frontend/components/mobile/PhoneNumberField.tsx`:

```tsx
import { useId } from "react";
import Form from "react-bootstrap/Form";
import flags from "react-phone-number-input/flags";
import PhoneInput, { type Value } from "react-phone-number-input/max";
import "react-phone-number-input/style.css";

interface PhoneNumberFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** The validity message to show, or null when there is nothing to say.
   *  Owned by the caller so the field can stay quiet until it is submitted
   *  rather than complaining at the first keystroke. */
  problem: string | null;
  disabled?: boolean;
}

/**
 * Replaces the `input[type=tel]` that app/frontend/entrypoints/intlTelInput.js
 * decorates on the legacy profile page: same country dropdown, same
 * international formatting, same E.164 value.
 *
 * `/max` metadata, matching lib/phone.ts, so both share one metadata bundle.
 * `flags` is imported explicitly because the default renders flags from a
 * remote SVG host — a network dependency this page does not need and E2E runs
 * should not have.
 */
export function PhoneNumberField({
  value,
  onChange,
  problem,
  disabled,
}: PhoneNumberFieldProps) {
  const inputId = useId();
  const problemId = useId();

  return (
    <Form.Group>
      <Form.Label htmlFor={inputId}>My mobile number is</Form.Label>
      <PhoneInput
        international
        defaultCountry="GB"
        flags={flags}
        disabled={disabled}
        // The library renders a country <select> and the number <input> as
        // siblings, so the id and the Bootstrap class have to be aimed at the
        // input rather than at the wrapper.
        numberInputProps={{
          id: inputId,
          className: "form-control",
          autoComplete: "tel",
          "aria-describedby": problem ? problemId : undefined,
          "aria-invalid": problem ? true : undefined,
        }}
        countrySelectProps={{ "aria-label": "Country" }}
        // The component wants undefined, not "", for an empty field.
        value={value === "" ? undefined : (value as Value)}
        onChange={(next) => onChange(next ?? "")}
      />
      {problem !== null && (
        <Form.Text id={problemId} className="text-danger">
          {problem}
        </Form.Text>
      )}
    </Form.Group>
  );
}
```

- [ ] **Step 4: Write `VerificationCodeField`**

Create `app/frontend/components/mobile/VerificationCodeField.tsx`:

```tsx
import { useId } from "react";
import Form from "react-bootstrap/Form";

interface VerificationCodeFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * The 6-digit code field from app/views/mobile_phone/verify_create.html.haml,
 * with the same pattern and length constraints. `one-time-code` lets iOS and
 * Android offer the code straight from the SMS, which the legacy field did
 * not.
 */
export function VerificationCodeField({
  value,
  onChange,
  disabled,
}: VerificationCodeFieldProps) {
  const inputId = useId();

  return (
    <Form.Group controlId={inputId}>
      <Form.Label>The 6 digit code</Form.Label>
      <Form.Control
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        required
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </Form.Group>
  );
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `corepack yarn test app/frontend/components/mobile`
Expected: PASS.

- [ ] **Step 6: Run the other gates**

Run: `corepack yarn lint:fix && corepack yarn typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/frontend/components/mobile/PhoneNumberField.tsx app/frontend/components/mobile/PhoneNumberField.test.tsx app/frontend/components/mobile/VerificationCodeField.tsx app/frontend/components/mobile/VerificationCodeField.test.tsx
git commit -m "Add the React phone number and verification code fields"
```

---

### Task 7: `MobileVerification` — the two-step form

**Files:**
- Create: `app/frontend/components/mobile/MobileVerification.tsx`
- Test: `app/frontend/components/mobile/MobileVerification.test.tsx`

**Interfaces:**
- Consumes: `PhoneNumberField` and `VerificationCodeField` (Task 6), `phoneNumberProblem` (Task 4), `sendVerification` / `confirmVerification` (Task 5), `apiErrorMessages` from `@/lib/apiErrors`, `FormErrors` from `@/components/forms/FormErrors`.
- Produces: `<MobileVerification initialNumber onVerified />` where `initialNumber: string` and `onVerified: () => void`. Consumed by Task 8.

- [ ] **Step 1: Write the failing test**

Create `app/frontend/components/mobile/MobileVerification.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MobileVerification } from "@/components/mobile/MobileVerification";
import { ApiError } from "@/lib/apiClient";
import { confirmVerification, sendVerification } from "@/lib/mobilePhone";
import { sessionPayload, testUser } from "@/test/sessionFixtures";

vi.mock("@/lib/mobilePhone", () => ({
  sendVerification: vi.fn(),
  confirmVerification: vi.fn(),
}));

const number = "+447911123456";

function renderForm(initialNumber = "") {
  const onVerified = vi.fn();
  render(
    <MobileVerification
      initialNumber={initialNumber}
      onVerified={onVerified}
    />,
  );
  return { onVerified };
}

async function submitNumber() {
  await userEvent.click(screen.getByRole("button", { name: "Send me a code" }));
}

async function submitCode(code = "123456") {
  await userEvent.type(screen.getByLabelText("The 6 digit code"), code);
  await userEvent.click(screen.getByRole("button", { name: "Verify" }));
}

describe("MobileVerification", () => {
  beforeEach(() => {
    vi.mocked(sendVerification).mockReset();
    vi.mocked(sendVerification).mockResolvedValue({ number, sent: true });
    vi.mocked(confirmVerification).mockReset();
    vi.mocked(confirmVerification).mockResolvedValue(
      sessionPayload({ currentUser: testUser }),
    );
  });

  // Assert the digits, not the exact text: react-phone-number-input formats
  // as you type, and the national grouping comes from libphonenumber metadata.
  it("starts from the number already on the account", () => {
    renderForm(number);

    const input = screen.getByLabelText(
      "My mobile number is",
    ) as HTMLInputElement;
    expect(input.value.replace(/\D/g, "")).toContain("7911123456");
  });

  it("sends a code and moves to the code step", async () => {
    renderForm(number);

    await submitNumber();

    await waitFor(() => expect(sendVerification).toHaveBeenCalledWith(number));
    expect(screen.getByLabelText("The 6 digit code")).toBeInTheDocument();
    expect(screen.getByText(/sent to/)).toHaveTextContent(number);
  });

  // The legacy widget blocked submission with a custom validity message; the
  // React form refuses to post instead, and says the same thing.
  it("refuses to send a number that is not a mobile", async () => {
    renderForm("+442079460000");

    await submitNumber();

    expect(sendVerification).not.toHaveBeenCalled();
    expect(
      screen.getByText("This doesn't look like a mobile phone number"),
    ).toBeInTheDocument();
  });

  it("stays quiet about the number until it is submitted", () => {
    renderForm("+442079460000");

    expect(
      screen.queryByText("This doesn't look like a mobile phone number"),
    ).not.toBeInTheDocument();
  });

  it("shows the API's message when the SMS cannot be sent", async () => {
    vi.mocked(sendVerification).mockRejectedValue(
      new ApiError(502, {
        error: {
          code: "sms_send_failed",
          messages: ["Sorry, I couldn't send you a verification SMS! Please try again later."],
          fields: {},
        },
      }),
    );
    renderForm(number);

    await submitNumber();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /couldn't send you a verification SMS/,
    );
    expect(screen.queryByLabelText("The 6 digit code")).not.toBeInTheDocument();
  });

  it("confirms the code and tells the caller", async () => {
    const { onVerified } = renderForm(number);

    await submitNumber();
    await submitCode();

    await waitFor(() =>
      expect(confirmVerification).toHaveBeenCalledWith("123456"),
    );
    expect(onVerified).toHaveBeenCalled();
  });

  it("keeps the code step open and shows why a wrong code failed", async () => {
    vi.mocked(confirmVerification).mockRejectedValue(
      new ApiError(422, {
        error: {
          code: "code_incorrect",
          messages: [
            "The code you entered was incorrect. Please use the code sent most recently.",
          ],
          fields: {},
        },
      }),
    );
    const { onVerified } = renderForm(number);

    await submitNumber();
    await submitCode("000000");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /code you entered was incorrect/,
    );
    expect(screen.getByLabelText("The 6 digit code")).toBeInTheDocument();
    expect(onVerified).not.toHaveBeenCalled();
  });

  it("re-sends to the same number", async () => {
    renderForm(number);

    await submitNumber();
    await userEvent.click(
      screen.getByRole("button", { name: "Send another code" }),
    );

    await waitFor(() => expect(sendVerification).toHaveBeenCalledTimes(2));
    expect(vi.mocked(sendVerification).mock.calls[1][0]).toBe(number);
  });

  it("goes back to the number step to change the number", async () => {
    renderForm(number);

    await submitNumber();
    await userEvent.click(
      screen.getByRole("button", { name: "Use a different number" }),
    );

    expect(screen.getByLabelText("My mobile number is")).toBeInTheDocument();
    expect(screen.queryByLabelText("The 6 digit code")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `corepack yarn test app/frontend/components/mobile/MobileVerification.test.tsx`
Expected: FAIL — cannot resolve `@/components/mobile/MobileVerification`.

- [ ] **Step 3: Write the component**

Create `app/frontend/components/mobile/MobileVerification.tsx`:

```tsx
import { type FormEvent, useState } from "react";
import Button from "react-bootstrap/Button";
import { FormErrors } from "@/components/forms/FormErrors";
import { PhoneNumberField } from "@/components/mobile/PhoneNumberField";
import { VerificationCodeField } from "@/components/mobile/VerificationCodeField";
import { apiErrorMessages } from "@/lib/apiErrors";
import { confirmVerification, sendVerification } from "@/lib/mobilePhone";
import { phoneNumberProblem } from "@/lib/phone";

interface MobileVerificationProps {
  /** The number already on the account, so the form starts from it rather
   *  than making the user retype it. Empty when there is none. */
  initialNumber: string;
  onVerified: () => void;
}

type Step = "number" | "code";

/**
 * Ports the whole legacy verification journey — the number field on
 * app/views/users/edit.html.haml plus mobile_phone/verify_create and
 * verify_token — into one two-step form.
 *
 * The number check is the client's own (lib/phone.ts, the ported
 * intl-tel-input rules); every other refusal comes from the API, which
 * re-checks everything regardless.
 */
export function MobileVerification({
  initialNumber,
  onVerified,
}: MobileVerificationProps) {
  const [step, setStep] = useState<Step>("number");
  const [number, setNumber] = useState(initialNumber);
  const [sentTo, setSentTo] = useState("");
  const [token, setToken] = useState("");
  const [showProblem, setShowProblem] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const problem = phoneNumberProblem(number);

  async function send(toNumber: string) {
    setBusy(true);
    setErrors([]);
    try {
      const sent = await sendVerification(toNumber);
      setSentTo(sent.number);
      setToken("");
      setStep("code");
    } catch (error) {
      setErrors(apiErrorMessages(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleNumberSubmit(event: FormEvent) {
    event.preventDefault();
    // Only complain once they have asked us to send: an error message that
    // appears on the first keystroke is noise.
    setShowProblem(true);
    if (problem !== null) {
      return;
    }
    await send(number);
  }

  async function handleCodeSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors([]);
    try {
      await confirmVerification(token);
      // Deliberately still busy: the caller re-renders around this, and
      // leaving the button live would invite a second confirm on the way out.
      onVerified();
    } catch (error) {
      setErrors(apiErrorMessages(error));
      setBusy(false);
    }
  }

  function handleChangeNumber() {
    setErrors([]);
    setShowProblem(false);
    setStep("number");
  }

  if (step === "number") {
    return (
      <form onSubmit={handleNumberSubmit}>
        <div className="d-flex flex-column gap-3">
          <PhoneNumberField
            value={number}
            onChange={setNumber}
            problem={showProblem ? problem : null}
            disabled={busy}
          />

          <p className="subdued small mb-0">
            We need your mobile number to help prevent people creating fake
            accounts. We will only use it to send you a verification code.
          </p>

          <FormErrors messages={errors} />

          <div className="d-flex justify-content-end">
            <Button type="submit" variant="primary" disabled={busy}>
              Send me a code
            </Button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleCodeSubmit}>
      <div className="d-flex flex-column gap-3">
        <p className="mb-0">A verification code was sent to {sentTo}</p>

        <VerificationCodeField
          value={token}
          onChange={setToken}
          disabled={busy}
        />

        <FormErrors messages={errors} />

        <div className="d-flex justify-content-end">
          <Button type="submit" variant="primary" disabled={busy}>
            Verify
          </Button>
        </div>

        <hr className="my-0" />

        <p className="small subdued mb-0">
          If it does not arrive within 5 minutes, you can send another code or
          go back and check the number.
        </p>

        <div className="d-flex gap-2">
          <Button
            type="button"
            variant="outline-secondary"
            disabled={busy}
            onClick={() => send(sentTo)}
          >
            Send another code
          </Button>
          <Button
            type="button"
            variant="outline-secondary"
            disabled={busy}
            onClick={handleChangeNumber}
          >
            Use a different number
          </Button>
        </div>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `corepack yarn test app/frontend/components/mobile/MobileVerification.test.tsx`
Expected: PASS.

- [ ] **Step 5: Run the other gates**

Run: `corepack yarn lint:fix && corepack yarn typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/frontend/components/mobile/MobileVerification.tsx app/frontend/components/mobile/MobileVerification.test.tsx
git commit -m "Add the two-step mobile verification form"
```

---

### Task 8: `RequireSwappingOpen` and the `/app/mobile` page

**Files:**
- Create: `app/frontend/components/auth/RequireSwappingOpen.tsx`
- Create: `app/frontend/pages/Mobile.tsx`
- Modify: `app/frontend/app/App.tsx`
- Modify: `config/routes.rb`
- Test: `app/frontend/components/auth/RequireSwappingOpen.test.tsx`
- Test: `app/frontend/pages/Mobile.test.tsx`

**Interfaces:**
- Consumes: `MobileVerification` (Task 7), `spaPaths.mobile` and `CurrentUser.mobileNumber` (Task 5), `RequireLogin` and `useAppMode`/`useSession` (existing).
- Produces: `<RequireSwappingOpen>` guard (reused by M7); the `Mobile` page at `spaPaths.mobile`, routed in both route tables.

- [ ] **Step 1: Write the failing tests**

Create `app/frontend/components/auth/RequireSwappingOpen.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RequireSwappingOpen } from "@/components/auth/RequireSwappingOpen";
import {
  sessionPayload,
  sessionValue,
  TestSessionProvider,
} from "@/test/sessionFixtures";

function renderGuard(swappingOpen: boolean) {
  render(
    <TestSessionProvider
      value={sessionValue({
        session: sessionPayload({
          appMode: swappingOpen ? "open" : "closed-wind-down",
          flags: { swappingOpen },
        }),
      })}
    >
      <RequireSwappingOpen>
        <p>The form</p>
      </RequireSwappingOpen>
    </TestSessionProvider>,
  );
}

describe("RequireSwappingOpen", () => {
  it("shows its children while swapping is open", () => {
    renderGuard(true);

    expect(screen.getByText("The form")).toBeInTheDocument();
  });

  it("replaces them with a notice while swapping is closed", () => {
    renderGuard(false);

    expect(screen.queryByText("The form")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/not open for swapping/i);
  });
});
```

Create `app/frontend/pages/Mobile.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { Mobile } from "@/pages/Mobile";
import {
  sessionPayload,
  sessionValue,
  testUser,
  TestSessionProvider,
} from "@/test/sessionFixtures";
import type { CurrentUser } from "@/types/api";

vi.mock("@/lib/mobilePhone", () => ({
  sendVerification: vi.fn(),
  confirmVerification: vi.fn(),
}));

function renderPage(user: CurrentUser | null) {
  render(
    <TestSessionProvider
      value={sessionValue({
        session: sessionPayload({ currentUser: user }),
      })}
    >
      <MemoryRouter>
        <Mobile />
      </MemoryRouter>
    </TestSessionProvider>,
  );
}

describe("Mobile", () => {
  it("asks a logged-out visitor to log in", () => {
    renderPage(null);

    expect(screen.getByRole("alert")).toHaveTextContent(/logged in/i);
    expect(
      screen.queryByLabelText("My mobile number is"),
    ).not.toBeInTheDocument();
  });

  it("shows the form to a user whose number is not verified", () => {
    renderPage({
      ...testUser,
      mobileVerified: false,
      mobileSetButNotVerified: true,
    });

    expect(screen.getByLabelText("My mobile number is")).toBeInTheDocument();
  });

  it("tells a verified user there is nothing to do", () => {
    renderPage(testUser);

    expect(
      screen.getByText("Your mobile phone number has already been verified"),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText("My mobile number is"),
    ).not.toBeInTheDocument();
  });

  it("lets a verified user start again with a different number", async () => {
    renderPage(testUser);

    await userEvent.click(
      screen.getByRole("button", { name: "Use a different number" }),
    );

    expect(screen.getByLabelText("My mobile number is")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `corepack yarn test app/frontend/pages/Mobile.test.tsx app/frontend/components/auth/RequireSwappingOpen.test.tsx`
Expected: FAIL — neither module resolves.

- [ ] **Step 3: Write the guard**

Create `app/frontend/components/auth/RequireSwappingOpen.tsx`:

```tsx
import type { ReactNode } from "react";
import Alert from "react-bootstrap/Alert";
import Container from "react-bootstrap/Container";
import { useAppMode } from "@/contexts/useAppMode";

/**
 * Shows its children only while swapping is open, mirroring
 * `require_swapping_open`. UX only: every endpoint behind these screens calls
 * `require_swapping_open!` itself, so a client that skipped this would gain
 * nothing.
 */
export function RequireSwappingOpen({ children }: { children: ReactNode }) {
  const { swappingOpen } = useAppMode();

  if (!swappingOpen) {
    return (
      <Container className="container-narrow py-5">
        <Alert variant="warning" role="alert" className="mb-0">
          We are not open for swapping at the moment
        </Alert>
      </Container>
    );
  }

  return <>{children}</>;
}
```

- [ ] **Step 4: Write the page**

Create `app/frontend/pages/Mobile.tsx`:

```tsx
import { useState } from "react";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Container from "react-bootstrap/Container";
import { Link } from "react-router-dom";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { RequireSwappingOpen } from "@/components/auth/RequireSwappingOpen";
import { MobileVerification } from "@/components/mobile/MobileVerification";
import { useSession } from "@/contexts/useSession";
import { spaPaths } from "@/lib/spaPaths";

/**
 * Ports app/views/mobile_phone/verify_create.html.haml and verify_token.html.haml,
 * plus the number field those two screens depend on
 * (app/views/mobile_phone/_form.html.haml). The legacy split across three
 * pages exists only because the number lives on the profile form; here it is
 * one screen.
 *
 * The success card sends the user on to /app/profile. The legacy card sends
 * them to the dashboard, which is M7 and unported — swap the destination when
 * it lands.
 */
export function Mobile() {
  const { session, refetchSession } = useSession();
  const [justVerified, setJustVerified] = useState(false);
  const [changing, setChanging] = useState(false);

  const user = session?.currentUser ?? null;
  const verified = user?.mobileVerified ?? false;

  async function handleVerified() {
    await refetchSession();
    setChanging(false);
    setJustVerified(true);
  }

  const showForm = !verified || changing;

  return (
    <RequireLogin>
      <RequireSwappingOpen>
        <Container className="container-narrow py-4">
          <Card>
            <Card.Header>
              <h1 className="h4 mb-0">
                {verified && !changing
                  ? "Mobile number verified"
                  : "Verify your mobile number"}
              </h1>
            </Card.Header>
            <Card.Body>
              {showForm ? (
                <MobileVerification
                  initialNumber={changing ? "" : (user?.mobileNumber ?? "")}
                  onVerified={handleVerified}
                />
              ) : (
                <div className="d-flex flex-column gap-3">
                  <p className="mb-0">
                    {justVerified
                      ? "Thank you for verifying your mobile phone number"
                      : "Your mobile phone number has already been verified"}
                  </p>
                  <div className="d-flex gap-2">
                    <Button as={Link} to={spaPaths.profile} variant="primary">
                      Continue
                    </Button>
                    <Button
                      type="button"
                      variant="outline-secondary"
                      onClick={() => {
                        setJustVerified(false);
                        setChanging(true);
                      }}
                    >
                      Use a different number
                    </Button>
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        </Container>
      </RequireSwappingOpen>
    </RequireLogin>
  );
}
```

- [ ] **Step 5: Add the react-router route**

In `app/frontend/app/App.tsx`, add the import alongside the other page imports:

```tsx
import { Mobile } from "@/pages/Mobile";
```

and the route immediately after the `spaPaths.review` route:

```tsx
                  <Route path={spaPaths.mobile} element={<Mobile />} />
```

- [ ] **Step 6: Add the Rails route**

In `config/routes.rb`, add to the SPA allow-list immediately after the `get "app/review"` line:

```ruby
  # M6 mobile verification. /user/edit and /mobile_phone/* keep serving HAML.
  get "app/mobile", to: "spa#index"
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `corepack yarn test`
Expected: PASS.

- [ ] **Step 8: Verify the route serves the SPA shell**

Run: `PATH="$HOME/.rbenv/shims:$PATH" bin/rails runner 'puts Rails.application.routes.recognize_path("/app/mobile")'`
Expected: `{:controller=>"spa", :action=>"index"}`.

- [ ] **Step 9: Run the other gates**

Run: `corepack yarn lint:fix && corepack yarn typecheck && PATH="$HOME/.rbenv/shims:$PATH" bundle exec rubocop`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add app/frontend/components/auth/RequireSwappingOpen.tsx app/frontend/components/auth/RequireSwappingOpen.test.tsx app/frontend/pages/Mobile.tsx app/frontend/pages/Mobile.test.tsx app/frontend/app/App.tsx config/routes.rb
git commit -m "Add the /app/mobile verification page"
```

---

### Task 9: Point the profile screen at `/app/mobile`

**Files:**
- Modify: `app/frontend/components/profile/ProfileForm.tsx`
- Test: `app/frontend/components/profile/ProfileForm.test.tsx`

**Interfaces:**
- Consumes: `spaPaths.mobile` and `CurrentUser.mobileNumber` (Task 5), the page from Task 8.
- Produces: nothing new. This is the last thing in the SPA linking out to the legacy `/user/edit`.

- [ ] **Step 1: Write the failing test**

Two edits to `app/frontend/components/profile/ProfileForm.test.tsx`.

First, the form now renders a react-router `<Link>`, which needs a router in
the tree. Add the import:

```tsx
import { MemoryRouter } from "react-router-dom";
```

and wrap the render inside the existing `renderForm` helper (it currently
calls `render(<ProfileForm … />)` with no wrapper):

```tsx
  render(
    <MemoryRouter>
      <ProfileForm
        parties={parties}
        constituencies={constituencies}
        user={overrides.user ?? user}
        locked={overrides.locked ?? false}
        hasSwap={overrides.hasSwap ?? true}
        onSaved={onSaved}
      />
    </MemoryRouter>,
  );
```

Second, replace the existing test — `it("links out to the legacy mobile page,
reporting what we have", …)`, around line 137, which asserts
`href="/user/edit"` — with these two:

```tsx
  it("links to the React mobile screen, reporting what we have", () => {
    renderForm();

    expect(screen.getByText(/not verified/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /verify your mobile/i }),
    ).toHaveAttribute("href", "/app/mobile");
  });

  it("offers a verified user the way to change their number", () => {
    renderForm({ user: { ...user, mobileVerified: true } });

    expect(
      screen.getByRole("link", { name: /change your mobile number/i }),
    ).toHaveAttribute("href", "/app/mobile");
  });
```

`user` here is the file's own `CurrentUser` literal, not the shared fixture.

- [ ] **Step 2: Run the test to verify it fails**

Run: `corepack yarn test app/frontend/components/profile/ProfileForm.test.tsx`
Expected: FAIL — the href is `/user/edit`.

- [ ] **Step 3: Rewire the link**

In `app/frontend/components/profile/ProfileForm.tsx`:

The file imports neither of these yet, so add both:

```tsx
import { Link } from "react-router-dom";
import { spaPaths } from "@/lib/spaPaths";
```

Delete the `hamlMobile` constant and change the comment above the remaining constant to:

```tsx
// Account deletion is not in the migration plan's screen list at all, so this
// still crosses to HAML.
const hamlDeleteAccount = "/confirm_account_deletion";
```

Replace the mobile status block with:

```tsx
        <div>
          <p className="mb-1">
            My mobile number is{" "}
            {user.mobileVerified ? "verified" : "not verified"}
          </p>
          <Link to={spaPaths.mobile}>
            {user.mobileVerified
              ? "Change your mobile number"
              : "Verify your mobile number"}
          </Link>
        </div>
```

Finally, update the component's doc comment: replace the paragraph beginning
"The mobile number is deliberately not editable here." with:

```tsx
 * The mobile number is deliberately not edited here. Verifying a number is a
 * two-step journey with its own screen (/app/mobile, M6), and a number that
 * changes has to be re-verified — so this reports the number's state and
 * links there.
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `corepack yarn test app/frontend/components/profile/ProfileForm.test.tsx`
Expected: PASS.

- [ ] **Step 5: Confirm nothing else in the SPA links to the legacy mobile page**

Run: `grep -rn "/user/edit" app/frontend`
Expected: no matches.

- [ ] **Step 6: Run the other gates**

Run: `corepack yarn lint:fix && corepack yarn typecheck && corepack yarn test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/frontend/components/profile/ProfileForm.tsx app/frontend/components/profile/ProfileForm.test.tsx
git commit -m "Point the profile screen's mobile link at /app/mobile"
```

---

### Task 10: End-to-end journey, axe scan and plan update

**Files:**
- Create: `playwright-tests/support/otp.ts`
- Create: `playwright-tests/mobile.spec.ts`
- Modify: `playwright-tests/accessibility.spec.ts`
- Modify: `docs/frontend-modernization-plan.md`

**Interfaces:**
- Consumes: everything above; `seedProfileUser` and `signIn` from `playwright-tests/support/`; `MESSAGEBIRD_FAKE_OTP` from Task 3.
- Produces: nothing further.

- [ ] **Step 1: Write the shared fixture**

Create `playwright-tests/support/otp.ts`:

```ts
// The fixed code SwapMyVote::MessageBird accepts when MESSAGEBIRD_FAKE_OTP is
// set, which Procfile.dev does for the dev and E2E stacks. Dev and CI have no
// MessageBird key, so this is the only way to drive the verification journey
// against the real controller.
export const fakeOtp = "123456";
```

- [ ] **Step 2: Write the failing E2E spec**

Create `playwright-tests/mobile.spec.ts`:

```ts
import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { spaPaths } from "@/lib/spaPaths";
import { signIn } from "./support/auth";
import { fakeOtp } from "./support/otp";
import { seedProfileUser } from "./support/seedProfileUser";

// See seedProfileUser.ts: a stale Spring preloader leaves `runner` hanging
// with no output, which stalls the suite before a test starts.
const railsEnv = { ...process.env, DISABLE_SPRING: "1" };

// Its own fixture row: this spec verifies and re-verifies a number, and
// fullyParallel would otherwise let that race the profile spec's saves.
const credentials = seedProfileUser("-mobile");

// A number no other spec uses. MobilePhone enforces uniqueness across the
// whole table, so a shared number would fail the second spec to run.
const number = "+447911123456";

// Each test starts from "no number on the account", whatever the last run
// left behind.
test.beforeEach(() => {
  execFileSync(
    "bin/rails",
    [
      "runner",
      `MobilePhone.where(number: "${number}").destroy_all
       User.find_by(email: "${credentials.email}")&.mobile_phone&.destroy`,
    ],
    { stdio: "inherit", env: railsEnv },
  );
});

test("must send a code and verify the number", async ({ page }) => {
  await signIn(page, credentials);
  await page.goto(spaPaths.mobile);

  await page.getByLabel("My mobile number is").fill(number);
  await page.getByRole("button", { name: "Send me a code" }).click();

  await expect(page.getByText(/A verification code was sent to/)).toBeVisible();

  await page.getByLabel("The 6 digit code").fill(fakeOtp);
  await page.getByRole("button", { name: "Verify" }).click();

  await expect(
    page.getByText("Thank you for verifying your mobile phone number"),
  ).toBeVisible();

  // The session really changed, not just this page's state: the profile
  // screen reads mobileVerified from the same payload.
  await page.goto(spaPaths.profile);
  await expect(page.getByText(/My mobile number is verified/)).toBeVisible();
});

test("must refuse a wrong code and keep the form open", async ({ page }) => {
  await signIn(page, credentials);
  await page.goto(spaPaths.mobile);

  await page.getByLabel("My mobile number is").fill(number);
  await page.getByRole("button", { name: "Send me a code" }).click();

  await page.getByLabel("The 6 digit code").fill("000000");
  await page.getByRole("button", { name: "Verify" }).click();

  await expect(page.getByRole("alert")).toContainText(
    /code you entered was incorrect/,
  );
  await expect(page.getByLabel("The 6 digit code")).toBeVisible();
});

test("must refuse a number that is not a mobile, without asking the server", async ({
  page,
}) => {
  await signIn(page, credentials);
  await page.goto(spaPaths.mobile);

  await page.getByLabel("My mobile number is").fill("+442079460000");
  await page.getByRole("button", { name: "Send me a code" }).click();

  await expect(
    page.getByText("This doesn't look like a mobile phone number"),
  ).toBeVisible();
  await expect(page.getByLabel("The 6 digit code")).toHaveCount(0);
});
```

- [ ] **Step 3: Add the page to the axe sweep**

In `playwright-tests/accessibility.spec.ts`, add to the `signedInPages` array, after the `Review` entry:

```ts
  {
    name: "Mobile",
    path: spaPaths.mobile,
    ready: (page) => page.getByLabel("My mobile number is"),
  },
```

The `-axe` fixture user has no mobile number, so this lands on the number
step — the form, not the already-verified card.

- [ ] **Step 4: Run the E2E suite**

Run: `corepack yarn e2e`
Expected: PASS. Requires `foreman` on PATH and a development database
(`bin/rails db:create db:schema:load` if it does not exist yet). If a stack is
already running from before Task 3, restart it — `MESSAGEBIRD_FAKE_OTP` is
read from the environment `Procfile.dev` sets.

- [ ] **Step 5: Mark M6 landed in the migration plan**

In `docs/frontend-modernization-plan.md`, replace the **M6** bullet with:

```markdown
- **M6 — Mobile verification.** ✅ **Landed.** Ported `MobilePhoneController` to `Api::V1::MobilePhoneVerificationsController` (`POST /api/v1/mobile_phone/verifications` to send, `POST .../verifications/confirm` to check), and replaced the `intlTelInput.js` jQuery widget with a React phone input on a single two-step screen at `/app/mobile` — enter number, enter code. `react-phone-number-input` supplies the country dropdown and `libphonenumber-js` the validation, so the legacy `MOBILE` / `FIXED_LINE_OR_MOBILE` check is now a pure function in `lib/phone.ts` with real unit tests. MessageBird's three token failures map to `code_already_used` / `code_expired` / `code_incorrect`; a fake OTP driver behind `MESSAGEBIRD_FAKE_OTP` (refused in production) lets Playwright drive the real controller path without an API key. `UserSerializer` gained `mobileNumber` so the form starts from the number on file, and `RequireSwappingOpen` arrived as the client mirror of `require_swapping_open`. `ProfileForm` now links to `/app/mobile` instead of the legacy `/user/edit`, which was the last thing in the SPA pointing at a HAML screen it had replaced. **`app/frontend/entrypoints/intlTelInput.js` and the HAML mobile pages are untouched and still live** — removal is M9 cleanup. Covered by `playwright-tests/mobile.spec.ts` and the signed-in block of `accessibility.spec.ts`.
```

Also update risk 7 in **Key risks & de-risking**, replacing the sentence
"port as React components with unit tests replicating exact checks (M3, M6)
before deleting the entrypoints" with:

```markdown
port as React components with unit tests replicating exact checks — both are now done (`PostcodeLookup` in M3, `PhoneNumberField` + `lib/phone.ts` in M6) — before deleting the entrypoints.
```

- [ ] **Step 6: Run every gate**

Run: `corepack yarn lint:fix && corepack yarn typecheck && corepack yarn test && PATH="$HOME/.rbenv/shims:$PATH" bundle exec rspec && PATH="$HOME/.rbenv/shims:$PATH" bundle exec rubocop`
Expected: PASS.

- [ ] **Step 7: Confirm the legacy screens are untouched**

Run: `git diff --stat master -- app/controllers/mobile_phone_controller.rb app/views/mobile_phone app/views/users/edit.html.haml app/views/admin/verify_mobile.html.haml app/frontend/entrypoints/intlTelInput.js`
Expected: no output — none of those files changed.

- [ ] **Step 8: Commit**

```bash
git add playwright-tests/support/otp.ts playwright-tests/mobile.spec.ts playwright-tests/accessibility.spec.ts docs/frontend-modernization-plan.md
git commit -m "Add the mobile verification E2E journey and mark M6 landed"
```

---

## Manual verification before the PR

Run the stack (`foreman start -f Procfile.dev`) and check, as a logged-in user:

1. `/app/mobile` with no number on the account — the form appears, a landline is refused client-side with "This doesn't look like a mobile phone number", and a mobile sends a code. With `MESSAGEBIRD_FAKE_OTP=123456` the SMS is skipped and `123456` is accepted.
2. A wrong code shows "The code you entered was incorrect. Please use the code sent most recently." and leaves the form open. "Send another code" and "Use a different number" both work.
3. After verifying, `/app/profile` says the number is verified and its link goes to `/app/mobile`.
4. `SWAPMYVOTE_MODE=closed-wind-down` (or `?opensesame=closed-wind-down`) — `/app/mobile` shows the "not open for swapping" notice, and `POST /api/v1/mobile_phone/verifications` answers 403 `swapping_closed`.
5. The legacy screens still work unchanged: `/user/edit` renders its phone widget, `/mobile_phone/verify_create` sends, `/mobile_phone/verify_token` verifies, and `/admin/verify_mobile` still fakes verification.
