require "rails_helper"

RSpec.describe "user/swaps/show", type: :view do
  context "with no potential swaps" do
    specify do
      assign(:user, build(:user))
      assign(:potential_swaps, [])
      expect { render }.not_to raise_error
    end
  end

  context "with recommendations and potential swaps" do
    specify do
      rec1 = build(:recommendation, site: "stop-the-tories")
      rec2 = build(:recommendation, site: "tactical-vote")
      willing_party = build(:party)
      preferred_party = build(:party)
      constituency1 = build(:ons_constituency, ons_id: "one", id: 1)
      constituency2 = build(:ons_constituency, ons_id: "two", id: 2, recommendations: [rec1, rec2])

      target_user = build(:user,
                          willing_party:  preferred_party,
                          preferred_party: willing_party,
                          constituency: constituency2
      )
      user = build(:user,
                   willing_party: willing_party,
                   preferred_party: preferred_party,
                   constituency: constituency1
      )

      assign(:user, user)
      assign(:potential_swaps, [target_user])

      expect { render }.not_to raise_error
    end
  end
end
