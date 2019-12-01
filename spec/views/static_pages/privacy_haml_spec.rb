require "rails_helper"

RSpec.describe "static_pages/privacy", type: :view do
  it "displays the privacy policy" do
    render
    expect(rendered).to include "privacy"
  end
end
