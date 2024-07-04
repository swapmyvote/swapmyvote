require "rails_helper"

RSpec.describe "user_mailer/reminder_to_accept_swap", type: :view do
  before do
    allow(OnsConstituency).to receive(:all).and_return([build(:wakefield), build(:tiverton)])
  end

  context "in a by-election" do
    specify "matches snapshot" do
      allow(view).to receive(:general_election?).and_return(false)
      swap = build(:swap_with_two_users, confirmed: false)

      assign(:user, swap.choosing_user)
      assign(:incoming_offer_user, swap.chosen_user)

      expect { render }.not_to raise_error

      expect(rendered).to match_snapshot("reminder_to_accept_swap_by_election")
    end
  end

  context "in a general election" do
    specify "matches snapshot" do
      allow(view).to receive(:general_election?).and_return(true)
      swap = build(:swap_with_two_users, confirmed: false)

      assign(:user, swap.choosing_user)
      assign(:incoming_offer_user, swap.chosen_user)

      expect { render }.not_to raise_error

      expect(rendered).to match_snapshot("reminder_to_accept_swap_general")
    end
  end
end
