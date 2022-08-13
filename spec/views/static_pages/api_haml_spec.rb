require "rails_helper"

RSpec.describe "static_pages/api", type: :view do
  before do
    allow(Party).to receive(:all).and_return([create(:party)])
  end

  context "in a by-election" do
    specify "matches snapshot" do
      allow(view).to receive(:general_election?).and_return(false)

      expect { render }.not_to raise_error

      expect(rendered).to match_snapshot("api_by_election")
    end
  end

  context "in a general election" do
    specify "matches snapshot" do
      allow(view).to receive(:general_election?).and_return(true)

      expect { render }.not_to raise_error

      expect(rendered).to match_snapshot("api_general")
    end
  end
end
