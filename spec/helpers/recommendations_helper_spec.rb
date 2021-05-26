require "rails_helper"
require "./db/fixtures/livefrombrexit_recommendations_json"

# Specs in this file have access to a helper object that includes
# the RecommendationsHelper. For example:
#
# describe RecommendationsHelper do
#   describe "string concat" do
#     it "concats two strings with spaces" do
#       expect(helper.concat_strings("this","that")).to eq("this that")
#     end
#   end
# end

RSpec.describe RecommendationsHelper, type: :helper do
  include Devise::Test::ControllerHelpers

  describe "#recommendations_for" do
    let(:constituency) { instance_double(OnsConstituency) }
    let(:real_recs) do
      rec_models = LivefrombrexitRecommendationsJson.new.constituencies.first["recs"].map do |recs_hash|
        rec = Recommendation.new(recs_hash.slice("site"))
        rec.text = recs_hash["recommendation"]
        rec.link = recs_hash["link"]
        rec
      end
      # Now jumble them up so we have a real test
      rec_models.sort do |a, b|
        a.site <=> b.site
      end
    end

    before { allow(constituency).to receive(:recommendations).and_return(real_recs) }

    specify "returns sites in required order" do
      expected_order = [
        "get-voting",
        "peoples-vote",
        "remain-united",
        "tacticalvote-co-uk",
        "tactical-vote",
        "avaaz-votesmart",
        "one-uk",
        "unite-2-leave"
      ]

      expect(helper.recommendations_for(constituency).map{ |s|  s.site }).to eq(expected_order)
    end
  end

  describe "#recommendations_sites" do
    it "has keys matching the recommendations json" do
      LivefrombrexitRecommendationsJson.new.unique_sites.each do |site|
        expect(helper.recommendations_sites).to have_key(site)
      end
    end
  end
end
