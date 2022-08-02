require "rails_helper"

RSpec.describe "user/vote/show", type: :view do
  context "when user has voted" do
    specify "matches snapshot" do
      swap = build(:swap_with_two_users)

      allow(swap.choosing_user).to receive(:has_voted).and_return(true)
      assign(:user, swap.choosing_user)

      expect { render }.not_to raise_error

      expect(rendered).to match_snapshot("show_when_voted")
    end
  end

  context "when user has not voted" do
    specify "matches snapshot" do
      swap = build(:swap_with_two_users)

      allow(swap.choosing_user).to receive(:has_voted).and_return(false)
      assign(:user, swap.choosing_user)

      expect { render }.not_to raise_error

      expect(rendered).to match_snapshot("show_when_not_voted")
    end
  end
end
