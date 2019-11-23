require "rails_helper"

RSpec.describe ApplicationHelper, type: :helper do
  describe "#current_user" do
    let(:user) { create(:user) }

    it "returns nil with empty session" do
      expect(helper.current_user).to be_nil
    end

    it "returns nil from invalid session[:user_id]" do
      session[:user_id] = 999999
      expect(helper.current_user).to be_nil
    end

    it "returns user from session[:user_id]" do
      session[:user_id] = user.id
      expect(helper.current_user).to eq(user)
    end

    it "caches user" do
      session[:user_id] = user.id
      expect(helper.current_user).to eq(user)
      session[:user_id] = user.id + 1
      expect(helper.current_user).to eq(user)
    end
  end

  describe "#logged_in?" do
    let(:user) { create(:user) }

    it "returns false with empty session" do
      expect(helper.logged_in?).to be false
    end

    it "returns false from invalid session[:user_id]" do
      session[:user_id] = 999999
      expect(helper.logged_in?).to be false
    end

    it "returns true for valid session[:user_id]" do
      session[:user_id] = user.id
      expect(helper.logged_in?).to be true
    end
  end

  describe "#canonical_name" do
    it "returns nil if name is nil" do
      expect(helper.canonical_name(nil)).to be_nil
    end

    it "returns parametrized name" do
      expect(helper.canonical_name("Liberal Democrats"))
        .to eq("liberal_democrats")
    end
  end
end
