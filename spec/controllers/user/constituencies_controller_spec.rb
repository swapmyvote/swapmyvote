require "rails_helper"

RSpec.describe User::ConstituenciesController, type: :controller do

  context "when configured for swaps" do
    before(:each) do
      allow(ENV).to receive(:[]).with("SWAPS_CLOSED").and_return(nil)
    end

    context "and user is logged in" do

      let(:logged_in_user) { instance_double(User, constituency: :some_constituency, email: :some_email) }

      before do
        session[:user_id] = :some_user_id
        allow(User).to receive(:find_by_id).with(:some_user_id).and_return(logged_in_user)
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

      describe "PATCH #update" do
        before { allow(logged_in_user).to receive(:update) }

        it "finds user based on session user_id" do
          expect(User).to receive(:find_by_id).with(:some_user_id).and_return(logged_in_user)
          patch :update, params: { :user => { :constituency_id => 2, :email => "a@b.c" }   }
        end

        it "updates the user" do
          expect(logged_in_user).to receive(:update)
          patch :update, params: { :user => { :constituency_id => 2, :email => "a@b.c" }   }
        end

        it "redirects to user share" do
          patch :update, params: { :user => { :constituency_id => 2, :email => "a@b.c" }   }
          expect(response).to redirect_to(:user_share)
        end
      end
    end
  end
end
