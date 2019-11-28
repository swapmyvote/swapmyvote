require "rails_helper"

RSpec.describe User::SwapsController, type: :controller do
  context "when users are logged in" do
    let(:new_user) do
      build(:user, id: 121,
            constituency: build(:ons_constituency, ons_id: "E121"),
            email: "foo@bar.com")
    end

    let(:mobile_phone) do
      build(:mobile_phone, user_id: 121, number: "07400 123456", verified: true)
    end

    let(:swap_user) do
      build(:user, id: 131,
            constituency: build(:ons_constituency, name: "Fareham", ons_id: "E131"),
            email: "match@foo.com")
    end

    let(:an_email) { double(:an_email) }

    before do
      session[:user_id] = new_user.id
      allow(User).to receive(:find_by_id).with(new_user.id)
                       .and_return(new_user)
      allow(User).to receive(:find).with(swap_user.id.to_s)
                       .and_return(swap_user)
      allow(new_user).to receive(:phone_verified?).and_return(true)
      allow(an_email).to receive(:deliver_now)
      allow(UserMailer).to receive(:confirm_swap).and_return(an_email)
      allow(UserMailer).to receive(:swap_cancelled).and_return(an_email)
    end

    describe "POST #create" do
      it "redirects to user page" do
        expect(new_user.swap).to be_nil

        post :create, params: { user_id: swap_user.id }

        expect(response).to redirect_to :user
        expect(new_user.swap.chosen_user_id).to eq swap_user.id

      end
    end
  end
end
