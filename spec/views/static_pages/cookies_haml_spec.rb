require "rails_helper"

RSpec.describe "static_pages/cookies", type: :view do
  it "displays the Cookies policy" do
    render
    expect(rendered).to include "cookies"
  end
end
