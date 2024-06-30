require "rails_helper"

RSpec.describe UsersController, type: :controller do
  include Devise::Test::ControllerHelpers

  context "when user is logged in" do
    let(:logged_in_user) do
      create(:ready_to_swap_user1, id: 111, constituency: build(:ons_constituency), willing_party: build(:party))
    end

    before do
      # Stub out authentication
      allow(request.env["warden"]).to receive(:authenticate!).and_return(logged_in_user)
      allow(controller).to receive(:current_user).and_return(logged_in_user)
    end

    describe "GET #new" do
      it "returns http success" do
        get :new
        expect(response).to have_http_status(:success)
      end

      it "assigns @identity" do
        get :new
        expect(assigns).to have_key(:identity)
      end
    end

    describe "GET #show" do
      it "returns http success" do
        swap_with_user = create(:ready_to_swap_user2, name: "Jane")
        consent_share_email = true

        logged_in_user.swap_with_user_id(swap_with_user.id, consent_share_email)

        get :show
        expect(response).to have_http_status(:success)
      end

      it "redirects to user_swap" do
        get :show
        expect(response).to redirect_to(:user_swap)
      end

      it "assigns @hide_polls" do
        get :show
        expect(assigns).to have_key(:hide_polls)
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

        expect(logged_in_user).to receive(:assign_attributes).and_call_original
        expect(logged_in_user).to receive(:save).and_call_original
        post :update, params: { user: { email: "a@b.c" } }
        logged_in_user.reload

        expect(logged_in_user.email).to eq("a@b.c")
        expect(response).to redirect_to(:user)
      end

      it "redirects to #edit if user has same preferred party and willing party" do
        post :update, params: { user: { preferred_party_id: 1, willing_party_id: 1 } }
        expect(response).to redirect_to(edit_user_path)
        expect(flash[:errors]).to be_present
        expect(flash[:errors]).to include("Preferred party and willing party cannot be the same")
      end

      it "redirects to #review if user has changed willing party" do
        post :update, params: { user: { willing_party_id: (logged_in_user.willing_party_id + 1) } }
        expect(response).to redirect_to(review_user_path)
        expect(flash[:errors]).not_to be_present
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
      # Stub out authentication
      allow(request.env["warden"]).to receive(:authenticate!).and_return(invalid_user)
      allow(controller).to receive(:current_user).and_return(invalid_user)
    end

    describe "GET #show" do
      it "redirects to edit_user_constituency" do
        get :show
        expect(response).to redirect_to(:edit_user_constituency)
      end
    end
  end
end
