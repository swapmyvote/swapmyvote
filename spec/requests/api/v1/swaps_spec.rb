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
    end
  end
end
