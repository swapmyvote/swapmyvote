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

    # Mirrors PATCH /api/v1/user's "with forgery protection on" context
    # above. This is the one endpoint in this milestone that cannot be
    # undone, so it checks the row survives the forged request, not just the
    # status code — a CSRF test that only asserted 422 would still pass if
    # the account were destroyed before the forgery check ran.
    context "with forgery protection on (as in production)" do
      around do |example|
        original = ActionController::Base.allow_forgery_protection
        ActionController::Base.allow_forgery_protection = true
        example.run
        ActionController::Base.allow_forgery_protection = original
      end

      it "rejects a request without a valid CSRF token, as JSON, and leaves the account intact" do
        user = create(:user, name: "Ada Lovelace")
        sign_in user

        delete "/api/v1/user", headers: { "X-CSRF-Token" => "not-the-token" }

        expect(response).to have_http_status(:unprocessable_entity)
        expect(json["error"]).to include("code" => "invalid_authenticity_token")
        expect(User.find_by(id: user.id)).to be_present
      end
    end

    # Api::V1::BaseController#render_record_not_destroyed converts the
    # exception `destroy!` raises when a before_destroy callback throws
    # :abort (e.g. one of User's `dependent: :destroy` associations failing
    # to destroy its target) into the API's JSON error convention instead of
    # a 500 HTML error page. Stubbing `destroy!` directly is more reliable
    # here than trying to make a real before_destroy hook throw :abort:
    # User's own hooks (clear_swap) call plain `.destroy` on the swap, whose
    # own abort only halts the swap's destroy, not the user's.
    it "converts a RecordNotDestroyed exception into the JSON error convention" do
      user = create(:user, name: "Ada Lovelace")
      sign_in user

      allow(user).to receive(:destroy!).and_raise(
        ActiveRecord::RecordNotDestroyed.new("Failed to destroy User", user)
      )

      delete "/api/v1/user"

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json["error"]["code"]).to eq("not_destroyed")
      expect(User.find_by(id: user.id)).to be_present
    end

    # The models do this, not the controller: User before_destroy :clear_swap,
    # Swap before_destroy :notify_users_of_cancelled_swap. Asserted here
    # because it is the promise the confirmation screen makes.
    #
    # Swap#notify_users_of_cancelled_swap sends two mails — one to each
    # party, each `to: @user.email` — so this checks the partner is actually
    # among the recipients, not just that some mail went out: a delivery
    # count alone would pass even if both mails went to the wrong address.
    it "cancels the swap and tells the partner" do
      user = create(:user, name: "Ada Lovelace")
      partner = create(:user, name: "Grace Hopper")
      user.create_outgoing_swap!(chosen_user: partner, confirmed: true)
      user.save!
      sign_in user

      delete "/api/v1/user"

      recipients = ActionMailer::Base.deliveries.map(&:to).flatten
      expect(recipients).to include(partner.email)
      expect(partner.reload.swap).to be_nil
    end

    # Mirrors UsersController#restricted_when_voting_open, which redirects
    # silently. Deleting mid-election would destroy a confirmed swap on the
    # day it matters.
    #
    # Follows this file's own convention (see "when voting is open and the
    # swap is confirmed" above) for driving the phase gate: a real confirmed
    # swap plus a stubbed SWAPMYVOTE_MODE, not allow_any_instance_of.
    it "refuses once voting is open and the swap is confirmed" do
      user = create(:user, name: "Ada Lovelace")
      create(:swap, chosen_user: user, confirmed: true)
      user.reload
      sign_in user
      allow(ENV).to receive(:[]).and_call_original
      allow(ENV).to receive(:[]).with("SWAPMYVOTE_MODE").and_return("open-and-voting")

      delete "/api/v1/user"

      expect(response).to have_http_status(:forbidden)
      expect(json["error"]["code"]).to eq("voting_info_locked")
      expect(User.find_by(id: user.id)).to be_present
    end
  end
end
