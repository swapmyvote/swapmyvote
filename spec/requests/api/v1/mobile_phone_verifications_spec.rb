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

    # A MobilePhone row with a nil number is a state the legacy controller
    # actively creates on a failed send (mobile_phone_controller.rb's
    # `phone&.update(number: nil)`), and both flows share one row. A re-send
    # against that row must read as "no number", not fall through to a
    # misleading uniqueness 422 or a 502 from sending to nil.
    it "422s when there is no number to send to and the existing row's number is nil" do
      user.create_mobile_phone!(number: nil)

      post path, params: {}, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json["error"]["code"]).to eq "number_missing"
    end

    it "422s a number that is not in E.164 form" do
      post path, params: { number: "07911 123456" }, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json["error"]["code"]).to eq "invalid_number"
      expect(user.reload.mobile_phone).to be_nil
    end

    # The collision is refused before any send: nothing is mutated, and no
    # code is texted to a number we are about to reject.
    it "422s a number that belongs to another account, leaving this one alone" do
      create(:user, name: "Jane").create_mobile_phone!(number: number)
      user.create_mobile_phone!(number: other_number)
      expect(SwapMyVote::MessageBird).not_to receive(:verify_create)

      post path, params: { number: number }, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json["error"]["code"]).to eq "validation_failed"
      expect(json["error"]["messages"]).to eq ["Number has already been taken"]
      expect(user.reload.mobile_phone.number).to eq other_number
    end

    # BaseController's RecordNotUnique rescue_from exists for exactly this
    # race: the pre-check above (number_taken?) and this write are not
    # atomic, so two concurrent sends for the same number can both pass the
    # check and then collide on mobile_phones' unique index. That is
    # impractical to reproduce for real inside a transactional request spec,
    # so stub the raise at User#mobile_number= rather than skip covering the
    # handler — a renamed or misspelled :with on that rescue_from would
    # otherwise only surface in production, on a race nobody can reproduce on
    # demand. any_instance_of because Devise reloads current_user from the
    # session on each request, so it is never the `user` let's own instance.
    it "422s when the write loses a uniqueness race to the database's own unique index" do
      allow(SwapMyVote::MessageBird).to receive(:verify_create).and_return(otp)
      # rubocop:disable RSpec/AnyInstance
      allow_any_instance_of(User)
        .to receive(:mobile_number=)
        .and_raise(ActiveRecord::RecordNotUnique.new("duplicate key value"))
      # rubocop:enable RSpec/AnyInstance

      post path, params: { number: number }, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json["error"]["code"]).to eq "validation_failed"
    end

    # Regression pin: a transient send failure must not touch a number that
    # was already on the account and already verified. The old
    # assign-then-send order destroyed the verified row to make room for a
    # number that was never actually sent, and then destroyed the
    # replacement too on the way out, leaving the account with no number at
    # all.
    it "leaves a verified user's original number alone when the send to a new number fails" do
      user.create_mobile_phone!(number: other_number, verified: true)
      allow(Airbrake).to receive(:notify)
      allow(SwapMyVote::MessageBird)
        .to receive(:verify_create)
        .and_raise(message_bird_error(21, "Something went wrong"))

      post path, params: { number: number }, as: :json

      expect(response).to have_http_status(:bad_gateway)
      expect(json["error"]["code"]).to eq "sms_send_failed"
      phone = user.reload.mobile_phone
      expect(phone.number).to eq other_number
      expect(phone.verified).to be true
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
      expect(phone.verify_id).to eq "verify-1"
    end

    # The case previous_verify_id exists for: a number that was never
    # verified, but already had a code sent to it (a live verify_id), gets
    # replaced by a different number before that code was ever entered. The
    # old MobilePhone row is destroyed by User#mobile_number= and a fresh one
    # created, so the old verify_id has to be captured and retired before
    # that reassignment happens — reading it off the row afterwards would
    # read nil.
    it "retires the old verify_id when an unverified number is replaced with a different one" do
      user.create_mobile_phone!(number: other_number, verify_id: "verify-0")
      expect(SwapMyVote::MessageBird)
        .to receive(:verify_delete).with("verify-0")
      expect(SwapMyVote::MessageBird)
        .to receive(:verify_create).and_return(otp)

      post path, params: { number: number }, as: :json

      expect(response).to have_http_status(:ok)
      phone = user.reload.mobile_phone
      expect(phone.number).to eq number
      expect(phone.verify_id).to eq "verify-1"
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

  context "with forgery protection on (as in production)" do
    around do |example|
      original = ActionController::Base.allow_forgery_protection
      ActionController::Base.allow_forgery_protection = true
      example.run
      ActionController::Base.allow_forgery_protection = original
    end

    before { sign_in user }

    # create is the action that spends money (an SMS through MessageBird),
    # so it is the one CSRF absolutely must not let through — asserted
    # alongside confirm's equivalent example below rather than only there.
    it "rejects a send without a valid CSRF token, as JSON" do
      post path,
           params: { number: number },
           headers: { "X-CSRF-Token" => "not-the-token" },
           as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json["error"]).to include("code" => "invalid_authenticity_token")
    end
  end

  describe "POST /api/v1/mobile_phone/verifications/confirm" do
    # A plain method, not `let`: confirm_path is a static string, so
    # memoisation buys nothing, and a `let` here would be the sixth helper
    # memoized in this example group's chain (on top of the five from the
    # file's top-level describe), tripping RSpec/MultipleMemoizedHelpers for
    # no benefit.
    def confirm_path
      "/api/v1/mobile_phone/verifications/confirm"
    end

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
