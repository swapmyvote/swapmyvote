require "rails_helper"

RSpec.describe "OmniAuth", type: :request do
  context "Twitter login", skip: "but we don't support twitter logins right now, fix the bug later" do
    before do
      OmniAuth.config.test_mode = true
      OmniAuth.config.mock_auth[:twitter] = OmniAuth::AuthHash.new({
        provider: "twitter",
        uid: "123545",
        info: { name: "Jane Doe", email: "j@doe.com",
                image: "https://image.com/123456" },
        credentials: { token: "ABC123", expires_at: Time.zone.now.midnight }
      })
    end

    it "creates both user and identity on first login" do
      get "/auth/twitter/callback", params: {}, headers: {}

      expect(response.status).to eq 302

      user = User.joins(:identity).find_by(identities: { uid: "123545" })
      expect(user.name).to eq "Jane Doe"
      expect(user.email).to eq "j@doe.com"
      expect(user.identity.email).to eq "j@doe.com"
      expect(user.image_url).to eq "https://image.com/123456"
      expect(user.provider).to eq "twitter"
      expect(user.profile_url).to eq "https://twitter.com/intent/user?user_id=123545"
      expect(user.token).to eq "ABC123"
      expect(user.expires_at).to eq Time.zone.now.midnight
    end

    it "updates existing user on subsequent login" do
      user = create(:user, name: "John Moe", email: "j@moe.com")
      create(:identity, user: user, provider: "twitter", uid: "123545",
             image_url: "https://image.com/654321", name: "John Moe",
             email: "j@foo.com")

      expect(user.token).to be_nil
      expect(user.expires_at).to be_nil

      get "/auth/twitter/callback", params: {}, headers: {}

      user = User.joins(:identity).find_by(identities: { uid: "123545" })
      expect(user.name).to eq "John Moe"
      expect(user.email).to eq "j@moe.com"
      expect(user.identity.email).to eq "j@foo.com"
      expect(user.image_url).to eq "https://image.com/654321"
      expect(user.provider).to eq "twitter"
      expect(user.profile_url).to eq "https://twitter.com/intent/user?user_id=123545"
      expect(user.token).to eq "ABC123"
      expect(user.expires_at).to eq Time.zone.now.midnight
    end
  end

  context "Facebook login", skip: "but we don't support twitter logins right now, fix the bug later" do
    before do
      OmniAuth.config.test_mode = true
      OmniAuth.config.mock_auth[:facebook] = OmniAuth::AuthHash.new({
        provider: "facebook",
        uid: "98723948",
        info: {
          name: "Joe Bloggs",
          email: "joe@bloggs.com",
          image: "http://graph.facebook.com/v3.0/98723948/picture",
          urls: { Facebook: "https://facebook.com/joe.bloggs" },
        },
        credentials: { token: "ABC123", expires_at: Time.zone.now.midnight }
      })
    end

    it "creates both user and identity on first login" do
      get "/auth/facebook/callback", params: {}, headers: {}

      expect(response.status).to eq 302

      user = User.joins(:identity).find_by(identities: { uid: "98723948" })
      expect(user.name).to eq "Joe Bloggs"
      expect(user.email).to eq "joe@bloggs.com"
      expect(user.identity.email).to eq "joe@bloggs.com"
      expect(user.image_url) \
        .to eq "//graph.facebook.com/v3.0/98723948/picture"
      expect(user.provider).to eq "facebook"
      expect(user.profile_url) \
        .to eq "https://facebook.com/joe.bloggs"
      expect(user.token).to eq "ABC123"
      expect(user.expires_at).to eq Time.zone.now.midnight
    end
  end
end
