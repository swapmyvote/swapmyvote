require "rails_helper"

RSpec.describe "static_pages/faq", type: :view do
  it "displays the FAQ" do
    render
    expect(rendered).to include "FAQ"
  end
end
