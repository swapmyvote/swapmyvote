require "rails_helper"

RSpec.describe "user_mailer/welcome_email", type: :view do
  before do
    allow(OnsConstituency).to receive(:all).and_return([build(:wakefield), build(:tiverton)])
  end

  context "when in by-election"  do
    specify "matches snapshot" do
      assign(:user, build(:ready_to_swap_user1))

      allow(view).to receive(:general_election?).and_return(false)

      expect { render }.not_to raise_error

      expect(rendered).to match_snapshot("welcome_email_by_election")
    end
  end

  context "when in general election"  do
    specify "matches snapshot" do
      assign(:user, build(:ready_to_swap_user1))

      allow(view).to receive(:general_election?).and_return(true)

      expect { render }.not_to raise_error

      expect(rendered).to match_snapshot("welcome_email_general")
    end
  end
end
