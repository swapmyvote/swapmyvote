require "rails_helper"

RSpec.describe Recommendation, type: :model do
  describe "#constituency" do
    specify { expect {subject.constituency}.not_to raise_error }

    it "is a relation to OnsConstituency" do
      expect(described_class.reflections["constituency"].class_name).to eq(OnsConstituency.name)
    end
  end

  describe "#party_style_from_text" do
    Party.smv_codes.each do |smv_code|
      describe "for party \"#{smv_code.titlecase}\"" do
        specify { expect(described_class.new(text: smv_code).party_style_from_text).not_to be_nil }
        specify { expect(described_class.new(text: smv_code).party_style_from_text).not_to eq("") }
      end
    end

    describe "for text not matching a party" do
      specify { expect(described_class.new(text: "combustible edison").party_style_from_text).not_to be_nil }
      specify { expect(described_class.new(text: "combustible edison").party_style_from_text).not_to eq("") }
    end
  end
end
