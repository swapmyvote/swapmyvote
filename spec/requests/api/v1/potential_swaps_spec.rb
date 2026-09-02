require "rails_helper"

RSpec.describe "Api::V1::PotentialSwaps", type: :request do
  include Devise::Test::IntegrationHelpers

  def json
    JSON.parse(response.body)
  end

  def stub_mode(mode)
    allow(ENV).to receive(:[]).and_call_original
    allow(ENV).to receive(:[]).with("SWAPMYVOTE_MODE").and_return(mode)
  end

  let(:woking) { create(:ons_constituency, name: "Woking", ons_id: "E14001063") }
  let(:wakefield) { create(:ons_constituency, name: "Wakefield", ons_id: "E14001009") }
  let(:green) { create(:party, name: "Green", color: "#6AB023") }
  let(:labour) { create(:party, name: "Labour", color: "#DC241f") }

  let(:user) do
    create(:user, name: "Ada Lovelace", email: "ada@example.com",
                  constituency_ons_id: woking.ons_id,
                  preferred_party: green, willing_party: labour)
  end

  # Complementary: they want what we offer and offer what we want. Must be in
  # a different constituency, and must have an email — both are conditions in
  # User#complementary_voters.
  let!(:candidate) do
    create(:user, name: "Grace Hopper", email: "grace@example.com",
                  constituency_ons_id: wakefield.ons_id,
                  preferred_party: labour, willing_party: green)
  end

  before do
    create(:poll, constituency_ons_id: wakefield.ons_id, party_id: green.id,
                  votes: 3100, marginal_score: 400)
    create(:poll, constituency_ons_id: wakefield.ons_id, party_id: labour.id,
                  votes: 3500, marginal_score: 400)
  end

  describe "GET /api/v1/potential_swaps" do
    it "401s when logged out" do
      get "/api/v1/potential_swaps"

      expect(response).to have_http_status(:unauthorized)
      expect(json["error"]["code"]).to eq "unauthenticated"
    end

    context "when logged in" do
      before { sign_in user }

      it "returns ranked candidates with the match expiry" do
        get "/api/v1/potential_swaps"

        expect(response).to have_http_status(:ok)
        expect(json["expiryMinutes"]).to eq 120
        expect(json["potentialSwaps"].length).to eq 1

        first = json["potentialSwaps"].first
        expect(first["userId"]).to eq candidate.id
        expect(first["constituencyName"]).to eq "Wakefield"
        expect(first["willingParty"]["name"]).to eq "Green"
        expect(first["preferredParty"]["name"]).to eq "Labour"
      end

      it "redacts the candidate's surname" do
        get "/api/v1/potential_swaps"

        # User#redacted_name appends " (test user)" for any @example.com
        # address (see User#test_user?) — the candidate factory's email
        # matches, so this is genuine, already-tested model behavior
        # (spec/models/user_spec.rb), not a serializer bug.
        expect(json["potentialSwaps"].first["name"]).to eq "Grace H (test user)"
      end

      it "never discloses a candidate's email address" do
        get "/api/v1/potential_swaps"

        expect(response.body).not_to include "grace@example.com"
        expect(json["potentialSwaps"].first).not_to have_key "email"
      end

      it "reports the verification badges the profile card draws" do
        create(:mobile_phone, user: candidate, number: "+447400123456",
                              verified: true)

        get "/api/v1/potential_swaps"

        expect(json["potentialSwaps"].first["badges"]).to eq(
          "mobileVerified" => true, "provider" => nil, "hasEmail" => true
        )
      end

      it "carries the candidate's constituency polls, biggest first" do
        get "/api/v1/potential_swaps"

        polls = json["potentialSwaps"].first["polls"]
        expect(polls.map { |poll| poll["partyName"] }).to eq %w[Labour Green]
        expect(polls.first["signedMarginalScore"]).to eq 400
        expect(polls.last["signedMarginalScore"]).to eq(-400)
      end

      it "carries a verdict for every recommendation site" do
        Recommendation.create!(constituency_ons_id: wakefield.ons_id,
                               site: "tacticalvote-co-uk", text: "Green",
                               link: "https://tacticalvote.co.uk/")
        RecommendedParty.create!(constituency_ons_id: wakefield.ons_id,
                                 site: "tacticalvote-co-uk", party: green)

        get "/api/v1/potential_swaps"

        recommendations = json["potentialSwaps"].first["recommendations"]
        expect(recommendations.length).to eq 7
        good = recommendations.find { |rec| rec["siteId"] == "tacticalvote-co-uk" }
        expect(good).to include("match" => "good", "text" => "Green",
                                "siteName" => "Tactical Vote")
        expect(recommendations.last["match"]).to eq "unknown"
        expect(recommendations.last["text"]).to be_nil
      end

      it "403s when swapping is closed" do
        stub_mode("closed-wind-down")

        get "/api/v1/potential_swaps"

        expect(response).to have_http_status(:forbidden)
        expect(json["error"]["code"]).to eq "swapping_closed"
      end

      it "403s when the user has not chosen both parties" do
        user.update!(willing_party: nil)

        get "/api/v1/potential_swaps"

        expect(response).to have_http_status(:forbidden)
        expect(json["error"]["code"]).to eq "profile_incomplete"
      end

      it "409s when the user is already swapped" do
        user.create_outgoing_swap!(chosen_user: candidate, confirmed: false)

        get "/api/v1/potential_swaps"

        expect(response).to have_http_status(:conflict)
        expect(json["error"]["code"]).to eq "already_swapped"
      end
    end
  end
end
