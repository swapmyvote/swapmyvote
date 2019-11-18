require 'rails_helper'

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
    context 'with user with no constituency id' do
      let(:no_constituency_user) { User.new(name: 'fred') }

      it 'is nil' do
        expect(no_constituency_user.constituency).to be_nil
      end
    end

    context 'with user with constituency id' do
      let(:constituency) { Constituency.create!(name: 'test con 1') }
      let(:user) { User.new(name: 'test user', constituency_id: constituency.id) }

      it 'is expected constituency' do
        expect(user.constituency).to eq(constituency)
      end
    end
  end
end
