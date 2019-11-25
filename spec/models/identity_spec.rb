require "rails_helper"

RSpec.describe Identity, type: :model do
  describe "#image_url" do
    it "preserves https URLs" do
      allow(subject).to receive(:image)
        .and_return("https://facebook.com/image/1234.jpg")
      expect(subject.image_url).to eq("https://facebook.com/image/1234.jpg")
    end

    it "converts an http URL into https" do
      allow(subject).to receive(:image)
        .and_return("http://facebook.com/image/1234.jpg")
      expect(subject.image_url).to eq("https://facebook.com/image/1234.jpg")
    end
  end
end
