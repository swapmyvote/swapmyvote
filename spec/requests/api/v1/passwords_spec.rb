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
