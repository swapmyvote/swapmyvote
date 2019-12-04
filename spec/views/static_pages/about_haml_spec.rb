require "rails_helper"

RSpec.describe "static_pages/about", type: :view do
  it "displays the About page" do
    render
    expect(rendered).to include "About"
  end
end
