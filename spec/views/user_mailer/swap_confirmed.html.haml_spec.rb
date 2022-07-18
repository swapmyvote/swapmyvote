require "rails_helper"

RSpec.describe "user_mailer/swap_confirmed", type: :view do
  context "with :swap_with_email_consent, true" do
    specify "matches snapshot" do
      swap = build(:swap_with_two_users)

      assign(:user, swap.choosing_user)
      assign(:swap_with, swap.chosen_user)
      assign(:swap_with_email_consent, true)

      expect { render }.not_to raise_error

      expect(rendered).to match_snapshot("swap_confirmed")
    end
  end
end
