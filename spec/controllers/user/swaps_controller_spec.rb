require "rails_helper"

RSpec.describe User::SwapsController, type: :controller do
  context "when users are logged in and verified" do
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
      allow(new_user).to receive(:mobile_phone_verified?).and_return(true)
      allow(an_email).to receive(:deliver_now)
      allow(UserMailer).to receive(:confirm_swap).and_return(an_email)
      allow(UserMailer).to receive(:swap_cancelled).and_return(an_email)
      allow(UserMailer).to receive(:swap_confirmed).and_return(an_email)
    end

    describe "POST #create" do
      it "redirects to user page" do
        expect(new_user.swap).to be_nil

        post :create, params: { user_id: swap_user.id }

        expect(response).to redirect_to :user
        expect(new_user.swap.chosen_user_id).to eq swap_user.id
        expect(new_user.swap.confirmed).to be false
      end
    end

    describe "PUT #update" do
      it "confirms the swap if all ducks are lined up" do
        swap = Swap.create(chosen_user_id: swap_user.id)
        new_user.incoming_swap = swap
        swap_user.outgoing_swap = swap

        expect(swap_user.swap.confirmed).to be nil

        put :update, params: { swap: { confirmed: true } }

        expect(response).to redirect_to :user
        expect(swap_user.swap.chosen_user_id).to eq new_user.id
        expect(swap_user.swap.confirmed).to be true
      end
    end
  end

  context "when users are not verified" do
    let(:new_user) do
      build(:user, id: 122,
            constituency: build(:ons_constituency, ons_id: "E121"),
            email: "foo@bar.com")
    end

    let(:mobile_phone) do
      build(:mobile_phone, user_id: 122, number: "07400 123456", verified: false)
    end

    let(:swap_user) do
      build(:user, id: 132,
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
      allow(new_user).to receive(:mobile_phone_verified?).and_return(false)
    end

    describe "POST #create" do
      it "redirects to user page" do
        expect(new_user.swap).to be_nil

        post :create, params: { user_id: swap_user.id }

        expect(response).to redirect_to :edit_user
        expect(flash[:errors].first).to eq "Please verify your mobile phone number before you swap!"
        expect(new_user.swap).to be_nil
      end
    end

    describe "PUT #update" do
      it "confirms the swap if all ducks are lined up" do
        swap = Swap.create(chosen_user_id: swap_user.id)
        new_user.incoming_swap = swap
        swap_user.outgoing_swap = swap

        expect(swap_user.swap.confirmed).to be nil

        put :update, params: { swap: { confirmed: true } }

        expect(response).to redirect_to :edit_user
        expect(flash[:errors].first).to eq "Please verify your mobile phone number before you swap!"
        expect(swap_user.swap.confirmed).to be nil
      end
    end
  end
end
