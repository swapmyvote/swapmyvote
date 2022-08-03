require "rails_helper"

RSpec.describe "home/_closed_warm_up", type: :view do
  before do
    allow(OnsConstituency).to receive(:all).and_return([build(:wakefield), build(:tiverton)])
  end

  context "in a by-election" do
    specify "matches snapshot" do
      allow(view).to receive(:general_election?).and_return(false)

      expect { render }.not_to raise_error

      expect(rendered).to match_snapshot("_closed_warm_up_by_election")
    end
  end

  context "in a general election" do
    specify "matches snapshot" do
      allow(view).to receive(:general_election?).and_return(true)

      expect { render }.not_to raise_error

      expect(rendered).to match_snapshot("_closed_warm_up_general")
    end
  end
end
