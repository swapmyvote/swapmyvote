require "rails_helper"

RSpec.describe "user_mailer/no_swap.html.haml", type: :view do
  before do
    allow(OnsConstituency).to receive(:all).and_return([build(:wakefield), build(:tiverton)])
  end

  context "in a by-election" do
    specify "matches snapshot" do
      allow(view).to receive(:general_election?).and_return(false)

      assign(:user, build(:ready_to_swap_user1))

      expect { render }.not_to raise_error

      expect(rendered).to match_snapshot("no_swap_by_election")
    end
  end

  context "in a general election" do
    specify "matches snapshot" do
      allow(view).to receive(:general_election?).and_return(true)

      assign(:user, build(:ready_to_swap_user1))

      expect { render }.not_to raise_error

      expect(rendered).to match_snapshot("no_swap_general")
    end
  end
end
