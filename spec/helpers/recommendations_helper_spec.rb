require "rails_helper"
require './db/fixtures/livefrombrexit_recommendations_json'

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
  describe "#recommendations_data_for" do
    let(:constituency) { OnsConstituency.new(id: 1) }

    specify { expect { helper.recommendations_data_for(constituency) }.not_to raise_error }
  end

  describe "#recommendations_sites" do
    it 'has keys matching the recommendations json' do
      LivefrombrexitRecommendationsJson.new.unique_sites.each do |site|
        expect(helper.recommendations_sites).to have_key(site)
      end
    end
  end
end
