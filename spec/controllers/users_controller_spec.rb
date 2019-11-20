require "rails_helper"

RSpec.describe UsersController, type: :controller do

  context "when user is logged in" do

    let(:logged_in_user) { instance_double(User, constituency: :some_constituency, email: :some_email) }

    before do
      session[:user_id] = :some_user_id
      allow(User).to receive(:find_by_id).with(:some_user_id).and_return(logged_in_user)
    end

    describe "GET #show" do
      it "returns http success" do
        expect(logged_in_user).to receive(:swapped?).and_return(true)
        get :show, session: { user_id: :some_user_id}
        expect(response).to have_http_status(:success)
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


    describe "GET #update" do
      it "redirects to #show" do
        expect(logged_in_user).to receive(:update)
        get :update, params: { :user => { :constituency_id => 2, :email => "a@b.c" }   }
        expect(response).to redirect_to(:user)
      end
    end

    describe "GET #destroy" do
      it "redirects to account_deleted" do
        expect(logged_in_user).to receive(:destroy)
        get :destroy
        expect(response).to redirect_to(:account_deleted)
      end
    end
  end
end
