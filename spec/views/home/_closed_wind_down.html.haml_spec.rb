require "rails_helper"

RSpec.describe "home/_closed_wind_down", type: :view do
  specify "matches snapshot" do

    expect { render }.not_to raise_error

    expect(rendered).to match_snapshot("_closed_wind_down")
  end
end