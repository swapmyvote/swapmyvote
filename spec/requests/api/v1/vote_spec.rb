require "rails_helper"

RSpec.describe "Api::V1::Vote", type: :request do
  include Devise::Test::IntegrationHelpers

  def json
    JSON.parse(response.body)
  end

  # A confirmed swap between two users, from the chooser's side. Mirrors the
  # setup in spec/requests/api/v1/swaps_spec.rb, not the plan's literal
  # `user.update!(swap: swap)`: User#swap (app/models/user.rb) is a plain
  # reader — `incoming_swap || outgoing_swap` — with no `swap=` writer, so the
  # swap has to go through the `outgoing_swap` association instead, and
  # `swap_id` only persists once the chooser itself is saved.
  #
  # `partner_name` keeps two users in one example from colliding: the :user
  # factory's email is derived from its (default "John") name, so two
  # unnamed `create(:user)` calls in the same example fail the uniqueness
  # validation.
  def confirmed_swap_for(user, partner_name:)
    partner = create(:user, name: partner_name)
    user.create_outgoing_swap!(chosen_user: partner, confirmed: true,
                               consent_share_email_chooser: true,
                               consent_share_email_chosen: true)
    user.save!
    partner.reload
    partner
  end

  describe "POST /api/v1/vote" do
    it "refuses an unauthenticated caller" do
      post "/api/v1/vote"

      expect(response).to have_http_status(:unauthorized)
      expect(json["error"]["code"]).to eq("unauthenticated")
    end

    it "refuses a user with no swap" do
      sign_in create(:user)

      post "/api/v1/vote"

      expect(response).to have_http_status(:conflict)
      expect(json["error"]["code"]).to eq("swap_not_confirmed")
    end

    it "refuses a user whose swap is not confirmed" do
      user = create(:user, name: "Ada Lovelace")
      user.create_outgoing_swap!(chosen_user: create(:user, name: "Grace Hopper"),
                                 confirmed: false)
      user.save!
      sign_in user

      post "/api/v1/vote"

      expect(response).to have_http_status(:conflict)
      expect(json["error"]["code"]).to eq("swap_not_confirmed")
    end

    it "records the vote and emails the partner exactly once" do
      user = create(:user, name: "Ada Lovelace")
      partner = confirmed_swap_for(user, partner_name: "Grace Hopper")
      sign_in user

      expect(UserMailer).to receive(:partner_has_voted)
        .with(partner).once.and_return(double(deliver_now: true))

      post "/api/v1/vote"

      expect(response).to have_http_status(:ok)
      expect(user.reload.has_voted).to be(true)
    end

    it "answers with the session payload" do
      user = create(:user, name: "Ada Lovelace")
      confirmed_swap_for(user, partner_name: "Grace Hopper")
      sign_in user
      allow(UserMailer).to receive(:partner_has_voted)
        .and_return(double(deliver_now: true))

      post "/api/v1/vote"

      expect(json["currentUser"]["hasVoted"]).to be(true)
      expect(json).to have_key("flags")
      expect(json).to have_key("appMode")
    end

    it "is idempotent: a repeat sends no second email" do
      user = create(:user, name: "Ada Lovelace")
      confirmed_swap_for(user, partner_name: "Grace Hopper")
      user.update!(has_voted: true)
      sign_in user

      expect(UserMailer).not_to receive(:partner_has_voted)

      post "/api/v1/vote"

      expect(response).to have_http_status(:ok)
      expect(json["currentUser"]["hasVoted"]).to be(true)
    end
  end
end
