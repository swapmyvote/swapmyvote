require "rails_helper"

RSpec.describe UsersController, type: :controller do
  include Devise::Test::ControllerHelpers

  context "when user is logged in" do
    let(:logged_in_user) do
      create(:user, id: 111,
            constituency: build(:ons_constituency),
            email: "foo@bar.com")
    end

    before do
      sign_in logged_in_user
    end

    describe "GET #show" do
      it "returns http success" do
        swap_with_user = create(:user)
        logged_in_user.swap_with_user_id(swap_with_user.id)

        get :show
        expect(response).to have_http_status(:success)
      end

      it "redirects to user_swap" do
        get :show
        expect(response).to redirect_to(:user_swap)
      end
    end

    describe "GET #edit" do
      let(:constituencies_list) { double(:constituencies_list) }
      before do
        allow(OnsConstituency).to receive(:all).and_return(constituencies_list)
        allow(constituencies_list).to receive(:order).with(:name).and_return(double.as_null_object)
      end

      it "returns http success" do
        get :edit
        expect(response).to have_http_status(:success)
      end

      it "loads all constituencies" do
        expect(OnsConstituency).to receive(:all).and_return(constituencies_list)
        get :edit
      end

      it "sorts constituencies by name" do
        expect(constituencies_list).to receive(:order).with(:name).and_return(double.as_null_object)
        get :edit
      end
    end

    describe "POST #update" do

      it "redirects to #show if user has verified phone number" do
        build(:mobile_phone, number: "07400 123456", verified: true, user_id: logged_in_user.id)

        expect(logged_in_user).to receive(:update)
        post :update, params: { user: { constituency_ons_id: 2, email: "a@b.c" } }
        logged_in_user.reload
        expect(logged_in_user.constituency_ons_id).to eq("2")
        expect(response).to redirect_to(:user)
      end
    end

    describe "DELETE #destroy" do
      it "redirects to account_deleted" do
        delete :destroy
        expect(response).to redirect_to(:account_deleted)
      end
    end
  end

  context "when user is not valid" do
    let(:invalid_user) { build(:user, id: 2) }

    before do
      session[:user_id] = invalid_user.id
      allow(User).to receive(:find_by_id).with(invalid_user.id)
                       .and_return(invalid_user)
    end

    describe "GET #show" do
      it "redirects to edit_user_constituency" do
        get :show
        expect(response).to redirect_to(:edit_user_constituency)
      end
    end
  end
end
