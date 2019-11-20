require "rails_helper"

RSpec.describe User, type: :model do
  describe "#image_url" do
    it "preserves https URLs" do
      allow(subject).to receive(:image).
        and_return("https://facebook.com/image/1234.jpg")
      expect(subject.image_url).to eq("https://facebook.com/image/1234.jpg")
    end

    it "converts an http URL into https" do
      allow(subject).to receive(:image).
        and_return("http://facebook.com/image/1234.jpg")
      expect(subject.image_url).to eq("https://facebook.com/image/1234.jpg")
    end
  end

  describe "#constituency" do
    context "with user with no constituency id" do
      let(:no_constituency_user) { User.new(name: "fred") }

      it "is nil" do
        expect(no_constituency_user.constituency).to be_nil
      end
    end

    context "with user with constituency id" do
      let(:constituency) { Constituency.create!(name: "test con 1") }
      let(:user) { User.new(name: "test user", constituency_id: constituency.id) }

      it "is expected constituency" do
        expect(user.constituency).to eq(constituency)
      end
    end
  end

  describe "#potential_swap_users" do
    let(:user) { User.new(name: "fred", id: 1) }

    specify { expect{user.potential_swap_users(5)}.not_to raise_error }
  end

  context "when user has no preferred party, willing party or constituency" do
    let(:no_swap_user) { User.new(name: "fred", id: 1) }

    specify { expect(no_swap_user).not_to be_ready_to_swap}

    context "setting constituency" do
      let(:the_change) { ->{ no_swap_user.constituency_id = 3 } }

      specify { expect(&the_change).to change(no_swap_user, :details_changed?).from(false).to(true) }
      specify { expect(&the_change).not_to change(no_swap_user, :ready_to_swap?).from(false) }
    end

    context "setting preferred_party" do
      let(:the_change) { ->{no_swap_user.preferred_party_id = 3} }

      specify { expect(&the_change).to change(no_swap_user, :details_changed?).from(false).to(true) }
      specify { expect(&the_change).not_to change(no_swap_user, :ready_to_swap?).from(false) }
    end

    context "setting willing_party" do
      let(:the_change) { ->{ no_swap_user.willing_party_id = 3 } }

      specify { expect(&the_change).to change(no_swap_user, :details_changed?).from(false).to(true) }
      specify { expect(&the_change).not_to change(no_swap_user, :ready_to_swap?).from(false) }
    end
  end
end
