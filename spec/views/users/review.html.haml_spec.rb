require "rails_helper"

RSpec.describe "users/review", type: :view do
  context "user with preferred_party nil and constituency nil" do
    # replicates error in https://github.com/swapmyvote/swapmyvote/issues/951
    specify do
      assign(:user, build(:user))
      expect { render }.not_to raise_error
    end
  end
end
