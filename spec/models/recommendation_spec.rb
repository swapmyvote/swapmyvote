require "rails_helper"

RSpec.describe Recommendation, type: :model do
  describe "#constituency" do
    specify { expect {subject.constituency}.not_to raise_error }

    it "is a relation to OnsConstituency" do
      expect(described_class.reflections["constituency"].class_name).to eq(OnsConstituency.name)
    end
  end
end
