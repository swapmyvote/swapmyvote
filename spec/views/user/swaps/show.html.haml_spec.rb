require "rails_helper"

RSpec.describe "user/swaps/show", type: :view do
  context "with no potential swaps" do
    specify do
      assign(:user, build(:user))
      assign(:potential_swaps, [])
      expect { render }.not_to raise_error
    end
  end

  context "with potential swaps" do
    specify do
      willing_party = build(:party)
      preferred_party = build(:party)
      constituency = build(:ons_constituency)

      target_user = build(:user,
                          willing_party:  preferred_party,
                          preferred_party: willing_party,
                          constituency: constituency
      )
      user = build(:user,
                   willing_party: willing_party,
                   preferred_party: preferred_party,
                   constituency: constituency
      )

      assign(:user, user)
      assign(:potential_swaps, [target_user])

      expect { render }.not_to raise_error
    end
  end
end
