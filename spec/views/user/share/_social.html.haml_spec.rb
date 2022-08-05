require "rails_helper"

RSpec.describe "user/share/_social", type: :view do
  before do
    allow(OnsConstituency).to receive(:all).and_return([build(:wakefield), build(:tiverton)])
  end

  context "in a by-election" do
    specify "matches snapshot" do
      allow(view).to receive(:general_election?).and_return(false)

      tagline_to_use = view.app_taglines[0]
      # we don't want the random one in the test
      allow(view).to receive(:app_tagline).and_return(tagline_to_use)

      expect { render }.not_to raise_error

      expect(rendered).to match_snapshot("_social_by_election")
    end
  end

  context "in a general election" do
    specify "matches snapshot" do
      allow(view).to receive(:general_election?).and_return(true)

      tagline_to_use = view.app_taglines[0]
      # we don't want the random one in the test
      allow(view).to receive(:app_tagline).and_return(tagline_to_use)

      expect { render }.not_to raise_error

      expect(rendered).to match_snapshot("_social_general")
    end
  end
end
