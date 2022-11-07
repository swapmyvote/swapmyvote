require "rails_helper"

RSpec.describe "user_mailer/email_address_shared.html.haml", type: :view do
  before do
    allow(OnsConstituency).to receive(:all).and_return([build(:wakefield), build(:tiverton)])
  end

  specify "matches snapshot" do
    swap = build(:swap_with_two_users)

    assign(:user, swap.choosing_user)
    assign(:swap_with, swap.chosen_user)

    expect { render }.not_to raise_error

    expect(rendered).to match_snapshot("email_address_shared")
  end
end
