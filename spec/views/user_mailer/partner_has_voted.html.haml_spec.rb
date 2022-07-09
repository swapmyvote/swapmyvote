require "rails_helper"

RSpec.describe "user_mailer/partner_has_voted.html.haml", type: :view do
  specify "matches snapshot" do
    swap = build(:swap_with_two_users)

    assign(:user, swap.choosing_user)
    assign(:swap_with, swap.chosen_user)

    expect { render }.not_to raise_error

    expect(rendered).to match_snapshot("partner_has_voted")
  end
end
