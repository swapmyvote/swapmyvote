require "rails_helper"

RSpec.describe "home/_closed_wind_down", type: :view do
  before do
    allow(OnsConstituency).to receive(:all).and_return([build(:wakefield), build(:tiverton)])
  end

  context "in a by-election" do
    specify "matches snapshot" do
      allow(view).to receive(:general_election?).and_return(false)

      expect { render }.not_to raise_error

      expect(rendered).to match_snapshot("_closed_wind_down_by_election")
    end
  end

  context "in a general election" do
    specify "matches snapshot" do
      allow(view).to receive(:general_election?).and_return(true)

      expect { render }.not_to raise_error

      expect(rendered).to match_snapshot("_closed_wind_down_general")
    end
  end
end
