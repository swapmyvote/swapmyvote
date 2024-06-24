require "rails_helper"

RSpec.describe "user/swaps/new", type: :view do
  specify do
    create(:ons_constituency, ons_id: "one", id: 1)
    willing_party = build(:party)
    preferred_party = build(:party)
    constituency = OnsConstituency.find_by(ons_id: "one")
    poll1 = build(:poll, party: willing_party, constituency: constituency, marginal_score: 900)
    poll2 = build(:poll, party: preferred_party, constituency: constituency, marginal_score: 900)
    constituency.update(polls: [poll1, poll2])
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
