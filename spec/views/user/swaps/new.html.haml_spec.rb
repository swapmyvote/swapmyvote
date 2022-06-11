require "rails_helper"

RSpec.describe "user/swaps/new", type: :view do
  specify do
    willing_party = build(:party)
    preferred_party = build(:party)
    constituency = build(:ons_constituency)
    user = build(:user,
                 willing_party: willing_party,
                 preferred_party: preferred_party,
                 constituency: constituency
    )
    assign(:swap_with, user)
    assign(:hide_polls, false)
    expect { render }.not_to raise_error
  end
end
