require "rails_helper"

RSpec.describe "layouts/application", type: :view do
  it "matches snapshot" do
    allow(view).to receive(:current_user).and_return(build(:user))

    expect { render }.not_to raise_error

    expect(rendered).to match_snapshot("application")
  end
end
