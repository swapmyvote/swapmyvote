require "rails_helper"

RSpec.describe "user/share/_social", type: :view do
  specify "matches snapshot" do

    tagline_to_use = view.app_taglines[0]

    # we don't want the random one in the test
    allow(view).to receive(:app_tagline).and_return(tagline_to_use)

    expect { render }.not_to raise_error

    expect(rendered).to match_snapshot("_social")
  end
end
