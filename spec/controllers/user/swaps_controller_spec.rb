require "rails_helper"

RSpec.describe User::SwapsController, type: :controller do
  include Devise::Test::ControllerHelpers

  context "when user has a potential swap" do
    let(:new_user) do
      build(:user, id: 121, email: "foo@bar.com")
    end

    let(:swap_user) do
      build(:user, id: 131,
            constituency: build(:ons_constituency, name: "Fareham", ons_id: "E131"),
            email: "match@foo.com")
    end

    let(:an_email) { double(:an_email) }

    before do
      # Stub out authentication
      allow(request.env["warden"]).to receive(:authenticate!).and_return(new_user)
      allow(controller).to receive(:current_user).and_return(new_user)

      allow(User).to receive(:find).with(swap_user.id.to_s)
                       .and_return(swap_user)
      allow(new_user).to receive(:mobile_phone_verified?).and_return(true)
      allow(an_email).to receive(:deliver_now)
      allow(UserMailer).to receive(:confirm_swap).and_return(an_email)
      allow(UserMailer).to receive(:swap_cancelled).and_return(an_email)
      allow(UserMailer).to receive(:swap_confirmed).and_return(an_email)
    end

    context "and no constituency" do
      describe "GET #new" do
        it "redirects to user page" do
          expect(new_user.swap).to be_nil

          get :create, params: { user_id: swap_user.id }

          expect(response).to redirect_to :edit_user
        end
      end

      describe "POST #create" do
        it "redirects to user page" do
          expect(new_user.swap).to be_nil

          post :create, params: { user_id: swap_user.id }

          expect(response).to redirect_to :edit_user
          expect(new_user.swap).to be_nil
        end
      end
    end

    context "and constituency" do
      before do
        new_user.constituency = build(:ons_constituency, ons_id: "E121")
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

      context "when all the ducks are lined up but swap is not yet confirmed" do
        let(:swap)  { Swap.create(chosen_user_id: swap_user.id) }

        before do
          new_user.save! # seemed to be necessary to get all the foreign keys right ... maybe try deleting later
          new_user.incoming_swap = swap
          new_user.save! # seemed to be necessary to get all the foreign keys right ... maybe try deleting later

          swap_user.save! # seemed to be necessary to get all the foreign keys right ... maybe try deleting later
          swap_user.outgoing_swap = swap
          swap_user.save! # seemed to be necessary to get all the foreign keys right ... maybe try deleting later
        end

        describe "PUT #update" do
          context "with confirmed: true" do
            it "changes the swap to confirmed" do
              expect(swap_user.swap.confirmed).to be nil

              put :update, params: { swap: { confirmed: true } }

              expect(response).to redirect_to :user
              expect(swap_user.swap.chosen_user_id).to eq new_user.id
              expect(flash[:errors]).to be_blank
              expect(swap_user.swap.confirmed).to be true
            end

            context "AND with consent_share_email_chosen: true" do
              it "changes the swap to consent_share_email_chosen: true" do
                expect { put :update, params: { swap: { confirmed: true, consent_share_email_chosen: true } } }
                  .to change(swap_user.swap, :consent_share_email_chosen).from(false).to(true)
              end
            end
          end

          context "with consent_share_email_chosen: true" do
            it "changes the swap to consent_share_email_chosen: true" do
              expect { put :update, params: { swap: { consent_share_email_chosen: true } } }
                .to change(swap_user.swap, :consent_share_email_chosen).from(false).to(true)
            end
          end
        end
      end
    end
  end

  context "when users are not verified" do
    let(:new_user) do
      build(:user, id: 122, name: "the new user",
            constituency: build(:ons_constituency, ons_id: "E121"),
            email: "foo@bar.com")
    end

    let(:mobile_phone) do
      build(:mobile_phone, user_id: 122, number: "07400 123456", verified: false)
    end

    let(:swap_user) do
      build(:user, id: 132, name: "the swap user",
            constituency: build(:ons_constituency, name: "Fareham", ons_id: "E131"),
            email: "match@foo.com")
    end

    let(:an_email) { double(:an_email) }

    before do
      # Stub out authentication
      allow(request.env["warden"]).to receive(:authenticate!).and_return(new_user)
      allow(controller).to receive(:current_user).and_return(new_user)

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

  context "when users don't have an email" do
    let(:new_user) do
      build(:user, id: 122,
            constituency: build(:ons_constituency, ons_id: "E121"),
            email: "")
    end

    let(:mobile_phone) do
      build(:mobile_phone, user_id: 122, number: "07400 123456", verified: true)
    end

    let(:swap_user) do
      build(:user, id: 132,
            constituency: build(:ons_constituency, name: "Fareham", ons_id: "E131"),
            email: "match@foo.com")
    end

    let(:an_email) { double(:an_email) }

    before do
      allow(request.env["warden"]).to receive(:authenticate!).and_return(new_user)
      allow(controller).to receive(:current_user).and_return(new_user)

      allow(User).to receive(:find).with(swap_user.id.to_s)
                       .and_return(swap_user)
      allow(new_user).to receive(:mobile_phone_verified?).and_return(true)
    end

    describe "POST #create" do
      it "redirects to user page" do
        expect(new_user.swap).to be_nil

        post :create, params: { user_id: swap_user.id }

        expect(response).to redirect_to :edit_user
        expect(flash[:errors].first).to eq "Please enter your email address before you swap!"
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
        expect(flash[:errors].first).to eq "Please enter your email address before you swap!"
        expect(swap_user.swap.confirmed).to be nil
      end
    end
  end
end
