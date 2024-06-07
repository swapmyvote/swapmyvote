require "rails_helper"

RSpec.describe RecommendedParty, type: :model do
  describe "#constituency" do
    specify { expect {subject.constituency}.not_to raise_error }

    it "is a relation to OnsConstituency" do
      expect(described_class.reflections["constituency"].class_name).to eq(OnsConstituency.name)
    end
  end
  describe "#party" do
    specify { expect {subject.party}.not_to raise_error }

    it "is a relation to Party" do
      expect(described_class.reflections["party"].class_name).to eq(Party.name)
    end
  end
end
