require "rails_helper"

RSpec.describe "Api::V1::PrePopulate", type: :request do
  before do
    OnsConstituency.delete_all
    Party.delete_all
  end

  def json
    JSON.parse(response.body)
  end

  let!(:constituency) { create(:wakefield) }
  let!(:green) { create(:party, name: "Green") }
  let!(:labour) { create(:party, name: "Labour") }

  it "stashes the entry form's answers and echoes back what it stored" do
    post "/api/v1/pre_populate", params: {
      constituency_ons_id: constituency.ons_id,
      preferred_party_id: green.id,
      willing_party_id: labour.id
    }

    expect(response).to have_http_status(:ok)
    expect(json).to eq(
      "constituencyOnsId" => "E14001009",
      "preferredPartyName" => "Green",
      "willingPartyName" => "Labour"
    )
  end

  it "keeps the answers for the next request, so they survive the trip to sign up" do
    post "/api/v1/pre_populate", params: {
      constituency_ons_id: constituency.ons_id,
      preferred_party_id: green.id,
      willing_party_id: labour.id
    }

    get "/api/v1/session"

    expect(response).to have_http_status(:ok)
    expect(session["pre_populate"]).to include(
      "constituency_ons_id" => "E14001009",
      "preferred_party_name" => "Green"
    )
  end

  it "writes the same session shape the legacy deep-link route does" do
    # /swap?willing_party_name=... stores parties by name, and
    # HomeController#prepopulate_fields_from_session reads them back that way.
    post "/api/v1/pre_populate", params: {
      constituency_ons_id: constituency.ons_id,
      preferred_party_id: green.id,
      willing_party_id: labour.id
    }

    expect(session["pre_populate"].keys).to match_array(
      %w[constituency_ons_id preferred_party_name willing_party_name]
    )
  end

  it "is available logged out — the entry form comes before sign up" do
    post "/api/v1/pre_populate", params: { constituency_ons_id: constituency.ons_id }

    expect(response).to have_http_status(:ok)
  end

  describe "input we did not serve" do
    it "drops a constituency we do not run swaps in" do
      post "/api/v1/pre_populate", params: {
        constituency_ons_id: "E14000000-not-ours"
      }

      expect(json["constituencyOnsId"]).to be_nil
    end

    it "drops a party id that does not exist" do
      post "/api/v1/pre_populate", params: {
        constituency_ons_id: constituency.ons_id,
        preferred_party_id: 999_999
      }

      expect(json["preferredPartyName"]).to be_nil
      expect(json["constituencyOnsId"]).to eq "E14001009"
    end

    it "accepts a partly-filled form, since the wizard fills it in two steps" do
      post "/api/v1/pre_populate", params: {
        constituency_ons_id: constituency.ons_id
      }

      expect(json).to eq(
        "constituencyOnsId" => "E14001009",
        "preferredPartyName" => nil,
        "willingPartyName" => nil
      )
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
      post "/api/v1/pre_populate",
           params: { constituency_ons_id: constituency.ons_id },
           headers: { "X-CSRF-Token" => "not-the-token" }

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json["error"]).to include("code" => "invalid_authenticity_token")
    end
  end
end
