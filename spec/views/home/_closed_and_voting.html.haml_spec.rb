require "rails_helper"

RSpec.describe "home/_closed_and_voting", type: :view do
  context "with a swap" do
    specify "matches snapshot" do
      swap = build(:swap_with_two_users)

      allow(view).to receive(:current_user).and_return(swap.choosing_user)

      expect { render }.not_to raise_error

      expect(rendered).to match_snapshot("_closed_and_voting_with_a_swap")
    end
  end
end
