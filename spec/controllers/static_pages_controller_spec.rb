require "rails_helper"

RSpec.describe StaticPagesController, type: :controller do
  include Devise::Test::ControllerHelpers

  describe "GET #faq" do
    it "returns http success" do
      get :faq
      expect(response).to have_http_status(:success)
    end
  end

  describe "GET #about" do
    it "returns http success" do
      get :about
      expect(response).to have_http_status(:success)
    end
  end

  describe "GET #privacy" do
    it "returns http success" do
      get :privacy
      expect(response).to have_http_status(:success)
    end
  end

  describe "GET #contact" do
    it "returns http success" do
      get :contact
      expect(response).to have_http_status(:success)
    end
  end

  describe "GET #confirm_account_deletion" do
    it "returns http success" do
      get :confirm_account_deletion
      expect(response).to have_http_status(:success)
    end
  end

  describe "GET #account_deleted" do
    it "returns http success" do
      get :account_deleted
      expect(response).to have_http_status(:success)
    end
  end
end
