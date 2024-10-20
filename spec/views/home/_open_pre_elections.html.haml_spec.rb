require "rails_helper"

RSpec.describe "home/_open_pre_elections", type: :view do
  before do
    allow(OnsConstituency).to receive(:all).and_return([build(:wakefield), build(:tiverton)])
  end

  context "when in by-election"  do
    specify "matches snapshot" do
      allow(view).to receive(:general_election?).and_return(false)

      assign(:parties, [build(:party, id: 1)])
      assign(:constituencies, OnsConstituency.all)

      expect { render }.not_to raise_error

      expect(rendered).to match_snapshot("_open_pre_elections_by_election")
    end
  end

  context "when in general election"  do
    specify "matches snapshot" do
      allow(view).to receive(:general_election?).and_return(true)

      assign(:parties, [build(:party, id: 1)])
      assign(:constituencies, OnsConstituency.all)

      expect { render }.not_to raise_error

      expect(rendered).to match_snapshot("_open_pre_elections_general")
    end
  end
end
