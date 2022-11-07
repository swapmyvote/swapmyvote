require "rails_helper"

RSpec.describe "user_mailer/swap_not_confirmed", type: :view do
  before do
    allow(OnsConstituency).to receive(:all).and_return([build(:wakefield), build(:tiverton)])
  end

  context "in a by-election" do
    specify "matches snapshot" do
      allow(view).to receive(:general_election?).and_return(false)
      swap = build(:swap_with_two_users)

      assign(:user, swap.choosing_user)
      assign(:swap_with, swap.chosen_user)
      assign(:swap_with_email_consent, true)

      expect { render }.not_to raise_error

      expect(rendered).to match_snapshot("swap_not_confirmed_by_election")
    end
  end

  context "in a general election" do
    specify "matches snapshot" do
      allow(view).to receive(:general_election?).and_return(true)
      swap = build(:swap_with_two_users)

      assign(:user, swap.choosing_user)
      assign(:swap_with, swap.chosen_user)
      assign(:swap_with_email_consent, true)

      expect { render }.not_to raise_error

      expect(rendered).to match_snapshot("swap_not_confirmed_general")
    end
  end
end
