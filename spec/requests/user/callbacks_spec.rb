require "rails_helper"

RSpec.describe "Sessions", type: :request do
  context "For omniauth testing" do
    before do
      OmniAuth.config.test_mode = true
      OmniAuth.config.mock_auth[:twitter] = OmniAuth::AuthHash.new({
        provider: "twitter",
        uid: "123545",
        info: { name: "Jane Doe", email: "j@doe.com", image: "http://image.com/123456" },
        credentials: { token: "ABC123", expires_at: Time.zone.now.midnight }
      })
    end

    it "creates both user and identity on first login" do
      get "/auth/twitter/callback", params: {}, headers: {}

      expect(response.status).to eq 302

      user = User.find_by(uid: "123545")
      expect(user.name).to eq "Jane Doe"
      expect(user.email).to eq "j@doe.com"
      expect(user.image_url).to eq "https://image.com/123456"
      expect(user.provider).to eq "twitter"
      expect(user.profile_url).to eq "https://twitter.com/intent/user?user_id=123545"
      expect(user.token).to eq "ABC123"
      expect(user.expires_at).to eq Time.zone.now.midnight
    end

    it "updates existing user on subsequent login" do
      user = User.create(name: "John Moe", uid: "123545",)
      Identity.create(user_id: user.id, provider: "twitter", uid: "123545",
                      image: "http://image.com/654321", name: "John Moe", email: "j@moe.com")

      expect(user.token).to be_nil
      expect(user.expires_at).to be_nil

      get "/auth/twitter/callback", params: {}, headers: {}

      user = User.find_by(uid: "123545")
      expect(user.name).to eq "John Moe"
      expect(user.email).to eq "j@moe.com"
      expect(user.image_url).to eq "https://image.com/654321"
      expect(user.provider).to eq "twitter"
      expect(user.profile_url).to eq "https://twitter.com/intent/user?user_id=123545"
      expect(user.token).to eq "ABC123"
      expect(user.expires_at).to eq Time.zone.now.midnight
    end
  end
end
