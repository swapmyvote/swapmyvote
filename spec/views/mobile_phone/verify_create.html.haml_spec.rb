require "rails_helper"

RSpec.describe "mobile_phone/verify_create.html.haml", type: :view do
  it "asks for verification token" do
    session[:user_id] = create(:user).id

    render

    expect(rendered).to include \
      "A verification code was sent to #{current_user.mobile_number}"
  end
end
