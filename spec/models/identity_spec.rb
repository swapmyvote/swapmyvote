require "rails_helper"

RSpec.describe Identity, type: :model do
  let(:user) { create(:user, name: "Fred") }

  context "from Facebook" do
    before do
      subject.provider = "facebook"
      subject.profile_url = "https://facebook.com/fred"
    end

    describe "#profile_url" do
      it "returns the right profile URL" do
        expect(subject.profile_url)
          .to eq "https://facebook.com/fred"
      end
    end
  end

  context "from Twitter" do
    before do
      subject.provider = "twitter"
      subject.uid = "fred"
    end

    describe "#profile_url" do
      it "returns the right profile URL" do
        expect(subject.profile_url)
          .to eq "https://twitter.com/intent/user?user_id=fred"
      end
    end
  end
end
