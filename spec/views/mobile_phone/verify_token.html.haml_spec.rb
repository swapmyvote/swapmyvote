require "rails_helper"

RSpec.describe "mobile_phone/verify_token.html.haml", type: :view do
  it "asks for verification token" do
    user = build(:user)
    session[:user_id] = user.id
    @new_verification = true

    render

    expect(rendered).to include \
      "Thank you for verifying your mobile phone number."
  end
end
