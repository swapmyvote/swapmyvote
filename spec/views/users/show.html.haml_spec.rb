require "rails_helper"

RSpec.describe "users/show", type: :view do
  specify do
    assign(:user, build(:user))
    expect { render }.not_to raise_error
  end
end
