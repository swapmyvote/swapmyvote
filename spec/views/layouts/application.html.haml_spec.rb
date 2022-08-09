require "rails_helper"

RSpec.describe "layouts/application", type: :view do
  context "in a by-election" do
    specify "matches snapshot" do
      allow(view).to receive(:general_election?).and_return(false)

      allow(view).to receive(:current_user).and_return(build(:user))

      expect { render }.not_to raise_error

      expect(rendered).to match_snapshot("application_by_election")
    end
  end

  context "in a general election" do
    specify "matches snapshot" do
      allow(view).to receive(:general_election?).and_return(true)

      allow(view).to receive(:current_user).and_return(build(:user))

      expect { render }.not_to raise_error

      expect(rendered).to match_snapshot("application_general")
    end
  end
end
