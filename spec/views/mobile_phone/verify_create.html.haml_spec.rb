require "rails_helper"

RSpec.describe "mobile_phone/verify_create.html.haml", type: :view do
  include Devise::Test::ControllerHelpers

  it "asks for verification token" do
    fred = create(:user, name: "Fred")
    fred.create_mobile_phone(number: "12345")

    sign_in fred

    render

    expect(rendered).to include \
      "A verification code was sent to #{fred.mobile_number}"
  end
end
