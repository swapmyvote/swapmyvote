require "rails_helper"

RSpec.describe "user/vote/show", type: :view do
  before do
    allow(OnsConstituency).to receive(:all).and_return([build(:wakefield), build(:tiverton)])
  end

  context "when in by-election"  do
    before do
      allow(view).to receive(:general_election?).and_return(false)
    end

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

  context "when in general election"  do
    before do
      allow(view).to receive(:general_election?).and_return(true)
    end

    context "when user has voted" do
      specify "matches snapshot" do
        swap = build(:swap_with_two_users)

        allow(swap.choosing_user).to receive(:has_voted).and_return(true)
        assign(:user, swap.choosing_user)

        expect { render }.not_to raise_error

        expect(rendered).to match_snapshot("show_when_voted_general")
      end
    end
  end
end
