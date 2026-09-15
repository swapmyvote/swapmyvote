require "rails_helper"

RSpec.describe "Api::V1::Passwords", type: :request do
  include Devise::Test::IntegrationHelpers
  include ActiveSupport::Testing::TimeHelpers

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
      }.not_to change(-> { ActionMailer::Base.deliveries.count }, :call)

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

    # Mirrors the "with forgery protection on" context in
    # spec/requests/api/v1/users_spec.rb. This endpoint changes a password
    # and signs a session in, so the forged request must be refused, and the
    # password + session must be provably untouched afterwards — not just
    # the status code.
    context "with forgery protection on (as in production)" do
      around do |example|
        original = ActionController::Base.allow_forgery_protection
        ActionController::Base.allow_forgery_protection = true
        example.run
        ActionController::Base.allow_forgery_protection = original
      end

      it "rejects a request without a valid CSRF token, as JSON, and changes nothing" do
        user = create(:user, name: "Ada Lovelace")
        token = reset_token_for(user)

        put "/api/v1/password",
            params: { token: token, password: "correct-horse-battery",
                      password_confirmation: "correct-horse-battery" },
            headers: { "X-CSRF-Token" => "not-the-token" }

        expect(response).to have_http_status(:unprocessable_entity)
        expect(json["error"]).to include("code" => "invalid_authenticity_token")
        expect(user.reload.valid_password?("correct-horse-battery")).to be(false)

        get "/api/v1/session"
        expect(json["currentUser"]).to be_nil
      end
    end
  end
end
