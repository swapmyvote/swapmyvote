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
      it "redirects to #show" do
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
end
