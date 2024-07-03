require "rails_helper"

RSpec.describe MobilePhoneController, type: :controller do
  include ApplicationHelper
  include Devise::Test::ControllerHelpers

  def otp
    OpenStruct.new({
      "id": "4e213b01155d1e35a9d9571v00162985",
      "href": "https://rest.messagebird.com/verify/4e213b01155d1e35a9d9571v00162985",
      "recipient": 31612345678,
      "reference": nil,
      "messages": {
        "href": "https://rest.messagebird.com/messages/31bce2a1155d1f7c1db9df6b32167259"
      },
      "status": "sent",
      "createdDatetime": "2016-05-03T14:26:57+00:00",
      "validUntilDatetime": "2016-05-03T14:27:27+00:00"
    })
  end

  def stub_verify_create
    allow(SwapMyVote::MessageBird).to receive(:verify_create)
                                        .and_return(otp)
  end

  context "when logged out" do
    describe "GET #verify_create" do
      it "returns http direct" do
        stub_verify_create
        get :verify_create
        expect(flash.alert).to be_nil
        expect(response).to redirect_to(root_path)
      end
    end
  end

  context "when logged in" do
    let(:user) { create(:user) }

    before do
      sign_in user
    end

    describe "GET #verify_create" do
      it "returns http success" do
        user.mobile_number = "07775 562 717"
        stub_verify_create
        get :verify_create
        expect(flash.alert).to be_nil
        expect(response).to have_http_status(:success)
        expect(response).to render_template "verify_create"
      end

      it "redirects to use page if no mobile number" do
        stub_verify_create
        get :verify_create
        expect(flash[:errors]).to include("Please enter your mobile phone number before you swap")
        expect(response).to redirect_to(edit_user_path)
      end
    end
  end
end
