require "rails_helper"

RSpec.describe "home/_open_pre_elections", type: :view do
  specify "matches snapshot" do

    assign(:parties, [create(:party)])

    expect { render }.not_to raise_error

    expect(rendered).to match_snapshot("_open_pre_elections")
  end
end
