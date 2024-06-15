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
      %w[tactical-vote stop-the-tories].map do |recs_site|
        rec = Recommendation.new(site: recs_site)
        rec.text = "#{recs_site}-recommendation"
        rec.link = "#{recs_site}-link"
        rec
      end
    end

    before { allow(constituency).to receive(:recommendations).and_return(real_recs) }

    specify "returns sites in required order" do
      expected_order = %w[
        stop-the-tories
        tactical-vote
      ]

      expect(helper.recommendations_for(constituency).map{ |s|  s.site }).to eq(expected_order)
    end
  end

  describe "#recommendation_site_models_in_order" do
    subject { helper.recommendation_site_models_in_order }

    specify { is_expected.not_to be_empty }

    specify { is_expected.to all(respond_to(:id)) }
    specify { is_expected.to all(respond_to(:order)) }
    specify { is_expected.to all(respond_to(:link)) }
  end
end
