require "rails_helper"

RSpec.describe UserMailer do
  describe "swap_cancelled" do
    let(:user1) { create(:user, email: "swap_user1@foo.com") }
    let(:user2) { create(:user, name: "Anne Doe", email: "swap_user2@foo.com") }

    it "sends email if swap_with is not blank" do
      user1.create_identity(provider: "twitter")
      response = UserMailer.swap_cancelled(user1, user2)
      expect(response.subject)
        .to eq "Your swapped vote with #{user2.name} has been cancelled."
    end

    it "sends email if swap_with is blank" do
      user1.create_identity(provider: "twitter")
      response = UserMailer.swap_cancelled(user1, nil)
      expect(response.subject).to eq "Your swapped vote has been cancelled."
    end

    it "fails cleanly if user is blank" do
      response = UserMailer.swap_cancelled(nil, user2)
      expect(response.to_json).to eq "null"
    end
  end
end
