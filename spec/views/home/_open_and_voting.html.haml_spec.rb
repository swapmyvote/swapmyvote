require "rails_helper"

RSpec.describe "home/_open_and_voting", type: :view do
  specify "matches snapshot" do

    assign(:parties, [create(:party)])

    allow(view).to receive(:current_user).and_return(create(:user))

    expect { render }.not_to raise_error

    expect(rendered).to match_snapshot("_open_and_voting")
  end
end
