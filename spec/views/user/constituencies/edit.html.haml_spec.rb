require "rails_helper"

RSpec.describe "user/constituencies/edit.html.haml", type: :view do

  it "asks for constituency" do
    assign(:user, User.new)
    assign(:constituencies, OnsConstituency.all.order(:name))

    render

    ["My constituency is", "Liverpool", "Knowsley"].each do |s|
      expect(rendered).to include s
    end
  end
end
