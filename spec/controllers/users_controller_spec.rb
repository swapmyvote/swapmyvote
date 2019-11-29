require "rails_helper"

RSpec.describe UsersController, type: :controller do
  context "when user is logged in" do
    let(:logged_in_user) do
      build(:user, id: 1,
            constituency: build(:constituency),
            email: "foo@bar.com")
    end

    before do
      session[:user_id] = logged_in_user.id
      allow(User).to receive(:find_by_id).with(logged_in_user.id)
                       .and_return(logged_in_user)
    end

    describe "GET #show" do
      it "returns http success" do
        expect(logged_in_user).to receive(:swapped?).and_return(true)
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
        allow(Constituency).to receive(:all).and_return(constituencies_list)
        allow(constituencies_list).to receive(:order).with(:name).and_return(double.as_null_object)
      end

      it "returns http success" do
        get :edit
        expect(response).to have_http_status(:success)
      end

      it "loads all constituencies" do
        expect(Constituency).to receive(:all).and_return(constituencies_list)
        get :edit
      end

      it "sorts constituencies by name" do
        expect(constituencies_list).to receive(:order).with(:name).and_return(double.as_null_object)
        get :edit
      end
    end

    describe "POST #update" do
      it "redirects to #show" do
        expect(logged_in_user).to receive(:update)
        post :update, params: { user: { constituency_id: 2, email: "a@b.c" } }
        expect(response).to redirect_to(:user)
      end
    end

    describe "DELETE #destroy" do
      it "redirects to account_deleted" do
        expect(logged_in_user).to receive(:destroy)
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
