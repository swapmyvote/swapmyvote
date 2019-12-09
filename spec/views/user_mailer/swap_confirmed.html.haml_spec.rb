require "rails_helper"

RSpec.describe "user_mailer/swap_confirmed", type: :view do
  context "wit all options on" do
    specify do
      willing_party = build(:party)
      preferred_party = build(:party)
      consituency1 = build(:ons_constituency)
      consituency2 = build(:ons_constituency)

      assign(:user,
             build(:user,
                   willing_party: willing_party,
                   preferred_party: preferred_party,
                   constituency: consituency1
             )
      )
      assign(:swap_with,
             build(:user,
                   willing_party: preferred_party,
                   preferred_party: willing_party,
                   constituency: consituency2
             )
      )
      assign(:swap_with_email_consent, true)
      expect { render }.not_to raise_error
    end
  end
end
