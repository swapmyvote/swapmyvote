require "rails_helper"

RSpec.describe UsersHelper, type: :helper do
  describe "#user_profile_link" do
    let(:profile_url) { "https://facebook.com/alice.bloggs" }
    let(:name) { "Alice Bloggs" }
    let(:user) { create(:user, name: name) }

    it "returns email link when there is no profile URL" do
      user.create_identity(provider: :facebook)
      expect(helper.user_profile_link(user)) \
        .to eq "<a href=\"mailto:alice.bloggs%40example.com\">" +
               "Alice Bloggs (test user)</a>"
    end

    it "returns a link when there is a profile URL" do
      user.create_identity(provider: :facebook, profile_url: profile_url)
      expect(helper.user_profile_link(user)) \
        .to eq '<a href="https://facebook.com/alice.bloggs">' +
               "Alice Bloggs (test user)</a>"
    end
  end
end
