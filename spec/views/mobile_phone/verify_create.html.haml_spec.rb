require "rails_helper"

RSpec.describe "mobile_phone/verify_create.html.haml", type: :view do
  fixtures :users

  it "asks for verification token" do
    session[:user_id] = users(:john_doe).id

    render

    expect(rendered).to include \
      "A verification code was sent to #{current_user.mobile_number}"
  end
end
