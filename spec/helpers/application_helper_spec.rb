require "rails_helper"
require "support/user_sessions.rb"

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

  describe "#mobile_verified?" do
    context "when logged out" do
      # This should never happen, but let's be safe

      it "returns false" do
        expect(helper.mobile_verified?).to be_falsey
      end
    end

    context "when logged in", logged_in: true do
      it "with no mobile phone returns false" do
        expect(helper.mobile_verified?).to be_falsey
      end

      context "with mobile phone" do
        before do
          phone = create(:mobile_phone, user: user)
          user.mobile_phone = phone
        end

        it "returns false when not verified" do
          expect(helper.mobile_verified?).to be_falsey
        end

        it "returns true when verified" do
          # Note that here we have to set verified = true on the
          # MobilePhone instance returned from current_user, since the
          # user local variable from let() is a different User
          # instance representing the same user, so setting verified =
          # true on that would not get picked up by the helper which
          # reads it from current_user.
          current_user.mobile_phone.verified = true

          expect(helper.mobile_verified?).to be_truthy
        end
      end
    end
  end

  describe "#mobile_needs_verification?" do
    context "when logged out" do
      # This should never happen, but let's be safe

      it "returns false" do
        expect(helper.mobile_needs_verification?).to be_falsey
      end
    end

    context "when logged in", logged_in: true do
      context "with no mobile phone" do
        it "returns false" do
          expect(helper.mobile_needs_verification?).to be_falsey
        end
      end

      context "with mobile phone" do
        before do
          phone = create(:mobile_phone, user: user)
          user.mobile_phone = phone
        end

        it "returns true when not verified" do
          expect(helper.mobile_needs_verification?).to be_truthy
        end

        it "returns false when verified" do
          # Note that here we have to set verified = true on the
          # MobilePhone instance returned from current_user, since the
          # user local variable from let() is a different User
          # instance representing the same user, so setting verified =
          # true on that would not get picked up by the helper which
          # reads it from current_user.
          current_user.mobile_phone.verified = true

          expect(helper.mobile_needs_verification?).to be_falsey
        end
      end
    end
  end
end
