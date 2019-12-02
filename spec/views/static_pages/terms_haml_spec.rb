require "rails_helper"

RSpec.describe "static_pages/terms", type: :view do
  it "displays the Terms and Conditions" do
    render
    expect(rendered).to include "Terms"
  end
end
