require "rails_helper"

RSpec.describe "user_mailer/reminder_to_get_swapping", type: :view do
  before do
    allow(OnsConstituency).to receive(:all).and_return([build(:wakefield), build(:tiverton)])
  end

  %w[by general].each do |election_type|
    %w[open open-and-voting].each do |mock_app_mode|
      context "in a by-election" do
        specify "matches snapshot" do
          allow(view).to receive(:general_election?).and_return(election_type == "general")
          allow(view).to receive(:app_mode).and_return(mock_app_mode)

          assign(:user, build(:ready_to_swap_user1))

          expect { render }.not_to raise_error

          expect(rendered).to match_snapshot("reminder_to_get_swapping_#{election_type}_election_#{mock_app_mode}")
        end
      end
    end
  end
end
