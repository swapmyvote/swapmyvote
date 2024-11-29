require "rails_helper"

RSpec.describe "home/_open_and_voting", type: :view do
  before do
    allow(OnsConstituency).to receive(:all).and_return([build(:wakefield), build(:tiverton)])
  end

  context "in a by-election" do
    specify "matches snapshot" do
      allow(view).to receive(:general_election?).and_return(false)
      allow(view).to receive(:hide_polls?).and_return(true)

      assign(:parties, [build(:party, id: 1)])
      assign(:constituencies, OnsConstituency.all)
      assign(:user, User.new)

      allow(view).to receive(:current_user).and_return(create(:user))

      expect { render }.not_to raise_error

      expect(rendered).to match_snapshot("_open_and_voting_by_election")
    end
  end

  context "in a general election" do
    specify "matches snapshot" do
      allow(view).to receive(:general_election?).and_return(true)
      allow(view).to receive(:hide_polls?).and_return(false)

      allow(view).to receive(:election_date_season_type).and_return("2019 general election")

      assign(:parties, [build(:party, id: 1)])
      assign(:constituencies, OnsConstituency.all)
      assign(:user, User.new)

      allow(view).to receive(:current_user).and_return(create(:user))

      expect { render }.not_to raise_error

      expect(rendered).to match_snapshot("_open_and_voting_general")
    end
  end
end
