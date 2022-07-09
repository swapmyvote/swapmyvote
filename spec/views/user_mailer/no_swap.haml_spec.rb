require "rails_helper"

RSpec.describe "user_mailer/no_swap.html.haml", type: :view do
  specify "matches snapshot" do
    assign(:user, build(:ready_to_swap_user1))

    expect { render }.not_to raise_error

    expect(rendered).to match_snapshot("no_swap")
  end
end
