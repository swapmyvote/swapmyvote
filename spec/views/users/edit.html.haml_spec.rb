require "rails_helper"

RSpec.describe "users/edit", type: :view do
  it "does not blow up" do
    user = build(:user)
    # session[:user_id] = user.id

    assign(:mobile_number, user.mobile_number)
    assign(:user, user)
    assign(:parties, Party.all)
    assign(:constituencies, Constituency.all.order(:name))

    expect { render }.not_to raise_error
  end
end
