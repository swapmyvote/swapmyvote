require "rails_helper"

RSpec.describe "static_pages/contact", type: :view do
  it "displays the contact page" do
    render
    expect(rendered).to include "hello@swapmyvote.uk"
  end
end
