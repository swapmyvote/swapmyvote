require "rails_helper"

RSpec.describe "users/edit", type: :view do
  fixtures :ons_constituencies

  before do
    user = build(:user)

    assign(:mobile_number, user.mobile_number)
    assign(:user, user)
    assign(:parties, Party.all)
    assign(:constituencies, OnsConstituency.all.order(:name))

    expect { render }.not_to raise_error
  end

  it "displays constituency" do
    render

    ["My constituency is", "Liverpool", "Knowsley", "E2096666"].each do |s|
      expect(rendered).to include s
    end
  end
end
