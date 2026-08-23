require "rails_helper"

# Reference data for the entry form: parties, constituencies, and the election
# prose the SPA builds its headings from.
RSpec.describe "Api::V1 reference data", type: :request do
  def json
    JSON.parse(response.body)
  end

  describe "GET /api/v1/parties" do
    it "returns every party, alphabetically, in the shape types/api.ts expects" do
      create(:party, name: "Zebra", color: "#000000")
      create(:party, name: "Aardvark", color: "#ffffff")

      get "/api/v1/parties"

      expect(response).to have_http_status(:ok)
      expect(json.map { |party| party["name"] }).to eq %w[Aardvark Zebra]
      expect(json.first.keys).to match_array(%w[id name color smvCode])
    end

    it "is available logged out — the entry form comes before sign up" do
      get "/api/v1/parties"

      expect(response).to have_http_status(:ok)
    end

    it "returns an empty list rather than an error when nothing is seeded" do
      get "/api/v1/parties"

      expect(response).to have_http_status(:ok)
      expect(json).to eq []
    end
  end

  describe "GET /api/v1/constituencies" do
    it "returns every constituency, alphabetically, keyed on the ONS GSS code" do
      create(:ons_constituency, name: "Woking")
      create(:tiverton)

      get "/api/v1/constituencies"

      expect(response).to have_http_status(:ok)
      expect(json.map { |c| c["name"] }).to eq ["Tiverton and Honiton", "Woking"]
      expect(json.first).to eq(
        "onsId" => "E14000996",
        "name" => "Tiverton and Honiton"
      )
    end

    it "is available logged out" do
      get "/api/v1/constituencies"

      expect(response).to have_http_status(:ok)
    end
  end

  describe "GET /api/v1/election" do
    def stub_env(values)
      allow(ENV).to receive(:[]).and_call_original
      values.each do |key, value|
        allow(ENV).to receive(:[]).with(key).and_return(value)
      end
    end

    it "describes a general election in the prose the headings need" do
      stub_env("ELECTION_DATE" => "2024-07-04", "ELECTION_TYPE" => "general")

      get "/api/v1/election"

      expect(response).to have_http_status(:ok)
      expect(json).to include(
        "generalElection" => true,
        "year" => "2024",
        "date" => "2024-07-04",
        "season" => "summer",
        "dateMd" => "July 4th",
        "dateSeasonType" => "2024 general election",
        "eventTitleWithYear" => "General Election 2024",
        "hashtags" => "#GeneralElection"
      )
    end

    it "describes by-elections by naming the constituencies involved" do
      create(:wakefield)
      create(:tiverton)
      stub_env("ELECTION_DATE" => "2022-06-23", "ELECTION_TYPE" => "by")

      get "/api/v1/election"

      expect(json).to include(
        "generalElection" => false,
        "dateSeasonType" => "2022 summer by-elections",
        # The ampersand substitution applies inside a name ("Tiverton and
        # Honiton" -> "Tiverton & Honiton"); the list itself still joins
        # with "and".
        "constituenciesAsSentence" => "Wakefield and Tiverton & Honiton"
      )
      # Two constituencies means "the other constituency" reads correctly;
      # with more it has to become "another".
      expect(json["constituencyOther"]).to eq "the other constituency"
    end

    it "hides poll numbers when there are only two constituencies to swap between" do
      create(:wakefield)
      create(:tiverton)

      get "/api/v1/election"

      expect(json["hidePolls"]).to be true
    end

    it "carries the donate call to action, off by default" do
      get "/api/v1/election"

      expect(json["donate"]).to include("show" => false)
      expect(json["donate"]["link"]).to be_present
    end

    it "turns the donate call to action on when DONATE_SHOW says so" do
      stub_env("DONATE_SHOW" => "yes", "DONATE_LINK" => "https://example.com/give")

      get "/api/v1/election"

      expect(json["donate"]).to eq(
        "link" => "https://example.com/give",
        "show" => true
      )
    end
  end
end
