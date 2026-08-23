require "rails_helper"

RSpec.describe "users/show", type: :view do
  specify do
    assign(:user, build(:user))
    expect { render }.not_to raise_error
  end

  it "loads the intlTelInput entrypoint from Vite" do
    assign(:user, build(:user))
    render

    expect(rendered).to match(%r{<script[^>]+src="/vite[^"]*/assets/intlTelInput-[^"]+\.js"})
    expect(rendered).not_to include "/packs"
  end
end
