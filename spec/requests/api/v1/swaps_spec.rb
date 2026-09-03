require "rails_helper"

RSpec.describe "Api::V1::Swaps", type: :request do
  include Devise::Test::IntegrationHelpers

  def json
    JSON.parse(response.body)
  end

  let(:wakefield) { create(:ons_constituency, name: "Wakefield", ons_id: "E14001009") }
  let(:green) { create(:party, name: "Green", color: "#6AB023") }
  let(:labour) { create(:party, name: "Labour", color: "#DC241f") }

  # Woking is created inline rather than as its own `let`: nothing else refers
  # to it, and RSpec/MultipleMemoizedHelpers caps this group at five.
  let(:user) do
    woking = create(:ons_constituency, name: "Woking", ons_id: "E14001063")
    create(:user, name: "Ada Lovelace", email: "ada@example.com",
                  constituency_ons_id: woking.ons_id,
                  preferred_party: green, willing_party: labour)
  end

  let(:partner) do
    create(:user, name: "Grace Hopper", email: "grace@example.com",
                  constituency_ons_id: wakefield.ons_id,
                  preferred_party: labour, willing_party: green)
  end

  describe "GET /api/v1/swap" do
    it "401s when logged out" do
      get "/api/v1/swap"

      expect(response).to have_http_status(:unauthorized)
      expect(json["error"]["code"]).to eq "unauthenticated"
    end

    context "when logged in with no swap" do
      before { sign_in user }

      it "answers with a null swap" do
        get "/api/v1/swap"

        expect(response).to have_http_status(:ok)
        expect(json["swap"]).to be_nil
      end
    end

    context "with an unconfirmed outgoing swap" do
      before do
        user.create_outgoing_swap!(chosen_user: partner, confirmed: false,
                                   consent_share_email_chooser: false)
        # create_outgoing_swap! writes the swaps row and sets the association in
        # memory, but users.swap_id is only persisted by saving the chooser —
        # and Swap#choosing_user reads that column.
        user.save!
        sign_in user
      end

      it "reports the swap from the chooser's side" do
        get "/api/v1/swap"

        expect(json["swap"]).to include("state" => "outgoing",
                                        "confirmed" => false,
                                        "consentGiven" => false,
                                        "validityHours" => 48)
      end

      it "redacts the partner's name until the swap is confirmed" do
        get "/api/v1/swap"

        expect(json["swap"]["partner"]["name"]).to eq "Grace H (test user)"
      end

      it "withholds contact details while the partner has not consented" do
        get "/api/v1/swap"

        expect(json["swap"]["partner"]["contact"]).to be_nil
        expect(response.body).not_to include "grace@example.com"
      end
    end

    context "with a confirmed swap the partner has consented to share" do
      before do
        user.create_outgoing_swap!(chosen_user: partner, confirmed: true,
                                   consent_share_email_chooser: true,
                                   consent_share_email_chosen: true)
        user.save!
        sign_in user
      end

      it "shows the partner's real name" do
        get "/api/v1/swap"

        expect(json["swap"]["partner"]["name"]).to eq "Grace Hopper (test user)"
      end

      it "discloses the partner's contact details" do
        get "/api/v1/swap"

        expect(json["swap"]["partner"]["contact"]).to include(
          "email" => "grace@example.com", "provider" => nil,
          "facebookLogin" => false
        )
      end
    end

    context "with an incoming swap" do
      before do
        partner.create_outgoing_swap!(chosen_user: user, confirmed: false,
                                      consent_share_email_chooser: true)
        partner.save!
        sign_in user
      end

      it "reports the swap from the chosen side" do
        get "/api/v1/swap"

        expect(json["swap"]["state"]).to eq "incoming"
        expect(json["swap"]["partner"]["name"]).to eq "Grace H (test user)"
      end

      it "reads consentGiven from the chosen user's own column" do
        get "/api/v1/swap"

        expect(json["swap"]["consentGiven"]).to be false
      end

      it "discloses a chooser partner's contact details once they have consented" do
        get "/api/v1/swap"

        expect(json["swap"]["partner"]["contact"]).to include(
          "email" => "grace@example.com"
        )
      end
    end
  end

  describe "POST /api/v1/swap" do
    def stub_mode(mode)
      allow(ENV).to receive(:[]).and_call_original
      allow(ENV).to receive(:[]).with("SWAPMYVOTE_MODE").and_return(mode)
    end

    # The four assert_* guards on the legacy #create all have to pass before
    # a swap can be offered.
    def make_ready(voter)
      create(:mobile_phone, user: voter, number: "+44740012#{voter.id}", verified: true)
    end

    before do
      make_ready(user)
      partner
    end

    it "401s when logged out" do
      post "/api/v1/swap", params: { user_id: partner.id, consent_share_email: true },
                           as: :json

      expect(response).to have_http_status(:unauthorized)
    end

    context "when logged in and ready" do
      before { sign_in user }

      it "creates the outgoing swap and answers with swap and session" do
        expect {
          post "/api/v1/swap", params: { user_id: partner.id, consent_share_email: true },
                               as: :json
        }.to change { user.reload.outgoing_swap }.from(nil)

        expect(response).to have_http_status(:created)
        expect(json["swap"]).to include("state" => "outgoing", "confirmed" => false,
                                        "consentGiven" => true)
        expect(json["session"]["currentUser"]["id"]).to eq user.id
        expect(json["session"]["swap"]["state"]).to eq "outgoing"
      end

      it "emails the chosen user" do
        expect {
          post "/api/v1/swap", params: { user_id: partner.id, consent_share_email: true },
                               as: :json
        }.to change { ActionMailer::Base.deliveries.count }.by(1)
      end

      it "422s without consent, and creates nothing" do
        post "/api/v1/swap", params: { user_id: partner.id, consent_share_email: false },
                             as: :json

        expect(response).to have_http_status(:unprocessable_entity)
        expect(json["error"]["code"]).to eq "consent_required"
        expect(json["error"]["messages"].first).to include "establish trust between you"
        expect(user.reload.outgoing_swap).to be_nil
      end

      it "409s when the chosen user is already swapped" do
        third = create(:user, name: "Alan Turing", email: "alan@example.com",
                              constituency_ons_id: wakefield.ons_id,
                              preferred_party: labour, willing_party: green)
        partner.create_outgoing_swap!(chosen_user: third, confirmed: false)
        partner.save!

        post "/api/v1/swap", params: { user_id: partner.id, consent_share_email: true },
                             as: :json

        expect(response).to have_http_status(:conflict)
        expect(json["error"]["code"]).to eq "swap_conflict"
        expect(json["error"]["messages"]).to include "Chosen user is already swapped"
      end

      it "403s when swapping is closed" do
        stub_mode("closed-wind-down")

        post "/api/v1/swap", params: { user_id: partner.id, consent_share_email: true },
                             as: :json

        expect(response).to have_http_status(:forbidden)
        expect(json["error"]["code"]).to eq "swapping_closed"
      end

      it "403s when the mobile number is not verified" do
        user.mobile_phone.update!(verified: false)

        post "/api/v1/swap", params: { user_id: partner.id, consent_share_email: true },
                             as: :json

        expect(response).to have_http_status(:forbidden)
        expect(json["error"]["code"]).to eq "mobile_unverified"
      end

      it "403s when the user has no email address" do
        user.update_columns(email: "")

        post "/api/v1/swap", params: { user_id: partner.id, consent_share_email: true },
                             as: :json

        expect(response).to have_http_status(:forbidden)
        expect(json["error"]["code"]).to eq "email_missing"
        expect(json["error"]["messages"])
          .to eq ["Please enter your email address before you swap"]
      end

      it "403s when the user has no constituency" do
        user.update!(constituency_ons_id: nil)

        post "/api/v1/swap", params: { user_id: partner.id, consent_share_email: true },
                             as: :json

        expect(response).to have_http_status(:forbidden)
        expect(json["error"]["code"]).to eq "constituency_missing"
      end
    end
  end

  describe "PATCH /api/v1/swap" do
    before do
      create(:mobile_phone, user: user, number: "+447400123456", verified: true)
    end

    context "with an incoming swap" do
      before do
        partner.create_outgoing_swap!(chosen_user: user, confirmed: false,
                                      consent_share_email_chooser: true)
        partner.save!
        sign_in user
      end

      it "confirms the swap when consent is given" do
        patch "/api/v1/swap", params: { confirmed: true, consent_share_email: true },
                              as: :json

        expect(response).to have_http_status(:ok)
        expect(json["swap"]).to include("confirmed" => true, "consentGiven" => true)
        expect(user.reload.incoming_swap.confirmed).to be true
      end

      it "shows the partner's real name once confirmed" do
        patch "/api/v1/swap", params: { confirmed: true, consent_share_email: true },
                              as: :json

        expect(json["swap"]["partner"]["name"]).to eq "Grace Hopper (test user)"
      end

      # Preserved from the legacy controller, where swap_consent_given? adds an
      # error and control falls through to update_swap, which does nothing.
      it "refuses to confirm without consent, and leaves the swap unconfirmed" do
        patch "/api/v1/swap", params: { confirmed: true, consent_share_email: false },
                              as: :json

        expect(response).to have_http_status(:unprocessable_entity)
        expect(json["error"]["code"]).to eq "consent_required"
        expect(user.reload.incoming_swap.confirmed).to be_falsey
      end

      it "records consent alone without confirming" do
        patch "/api/v1/swap", params: { consent_share_email: true }, as: :json

        expect(response).to have_http_status(:ok)
        expect(json["swap"]).to include("confirmed" => false, "consentGiven" => true)
      end
    end

    context "with an outgoing swap" do
      before do
        user.create_outgoing_swap!(chosen_user: partner, confirmed: false,
                                   consent_share_email_chooser: false)
        # create_outgoing_swap! writes the swaps row and sets the association in
        # memory, but users.swap_id is only persisted by saving the chooser —
        # and Swap#choosing_user reads that column.
        user.save!
        sign_in user
      end

      it "records the chooser's consent" do
        patch "/api/v1/swap", params: { consent_share_email: true }, as: :json

        expect(json["swap"]["consentGiven"]).to be true
        expect(user.reload.outgoing_swap.consent_share_email_chooser).to be true
      end
    end

    context "with no swap" do
      before { sign_in user }

      it "409s" do
        patch "/api/v1/swap", params: { consent_share_email: true }, as: :json

        expect(response).to have_http_status(:conflict)
        expect(json["error"]["code"]).to eq "no_swap"
      end
    end
  end

  describe "DELETE /api/v1/swap" do
    before do
      create(:mobile_phone, user: user, number: "+447400123456", verified: true)
    end

    context "with an incoming swap" do
      before do
        partner.create_outgoing_swap!(chosen_user: user, confirmed: false)
        partner.save!
        sign_in user
      end

      it "destroys the swap and answers with a null swap" do
        expect {
          delete "/api/v1/swap", as: :json
        }.to change(Swap, :count).by(-1)

        expect(response).to have_http_status(:ok)
        expect(json["swap"]).to be_nil
        expect(json["session"]["swap"]).to be_nil
      end

      it "emails both sides" do
        expect {
          delete "/api/v1/swap", as: :json
        }.to change { ActionMailer::Base.deliveries.count }.by(2)
      end
    end

    # Faithful to assert_incoming_swap_exists: the HAML outgoing view offers no
    # cancel control at all, and #destroy refuses without an incoming swap.
    context "with only an outgoing swap" do
      before do
        user.create_outgoing_swap!(chosen_user: partner, confirmed: false)
        user.save!
        sign_in user
      end

      it "409s and leaves the swap alone" do
        expect {
          delete "/api/v1/swap", as: :json
        }.not_to change(Swap, :count)

        expect(response).to have_http_status(:conflict)
        expect(json["error"]["code"]).to eq "no_swap"
      end
    end
  end
end
