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
