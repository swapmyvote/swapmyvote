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
        # A third party: the brief's version set both preferred and willing
        # to `green`, but User's DistinctPartiesValidator rejects
        # preferred == willing, so that combination 422s instead of
        # exercising reviewRequired. A third party keeps preferred_party_id
        # unchanged (green) while genuinely changing willing_party_id.
        snp = create(:party, name: "SNP", color: "#FDF38E")

        patch "/api/v1/user",
              params: { preferred_party_id: green.id, willing_party_id: snp.id,
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

    context "with forgery protection on (as in production)" do
      around do |example|
        original = ActionController::Base.allow_forgery_protection
        ActionController::Base.allow_forgery_protection = true
        example.run
        ActionController::Base.allow_forgery_protection = original
      end

      it "rejects a request without a valid CSRF token, as JSON" do
        sign_in user

        patch "/api/v1/user",
              params: { email: "forged@example.com" },
              headers: { "X-CSRF-Token" => "not-the-token" }

        expect(response).to have_http_status(:unprocessable_entity)
        expect(json["error"]).to include("code" => "invalid_authenticity_token")
        expect(user.reload.email).to eq "voter@example.com"
      end
    end

    context "when voting is open and the swap is confirmed" do
      before do
        # A real confirmed swap rather than a stub: `user.swap` is
        # `incoming_swap || outgoing_swap`, so being the chosen user is enough.
        create(:swap, chosen_user: user, confirmed: true)

        # `user`'s own `create` (in the `let` above) ran with no swap yet, and
        # its `before_save :clear_swap, if: :details_changed?` callback reads
        # `incoming_swap` at that point, caching `nil` on this Ruby object.
        # Devise's request-spec `sign_in` (Warden test mode) hands this exact
        # object back as `current_user` on the next request, so without a
        # reload the controller would see the stale cached `nil` instead of
        # the swap just created above. Not a production bug: a real request
        # always deserializes `current_user` fresh from the DB.
        user.reload
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
