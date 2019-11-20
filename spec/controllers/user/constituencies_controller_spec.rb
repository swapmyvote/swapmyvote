require 'rails_helper'

RSpec.describe User::ConstituenciesController, type: :controller do

  context 'when configured for swaps' do
    before(:each) do
      allow(ENV).to receive(:[]).with("SWAPS_CLOSED").and_return(nil)
    end

    context 'and user is logged in' do
      before do
        expect(subject).to receive(:logged_in?).and_return(true)
        session[:user_id] = :some_user_id
      end

      describe "GET #edit" do
        it "returns http success" do
          get :edit
          expect(response).to have_http_status(:success)
        end
      end

      describe "PATCH #update" do
        before(:each) do
          allow(User).to receive(:find_by_id).with(:some_user_id).and_return(User.new)
        end

        it "redirects to user share" do
          patch :update, params: { user: { constituency_id: 2, email: "a@b.c" } }
          expect(response).to redirect_to(:user_share)
        end

        it "finds user based on session user_id" do
          expect(User).to receive(:find_by_id).with(:some_user_id).and_return(User.new)
          patch :update, params: { user: { constituency_id: 2, email: "a@b.c" } }
        end
      end
    end
  end
end
