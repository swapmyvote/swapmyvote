require "rails_helper"

RSpec.describe OnsConstituency, type: :model do
  subject { described_class.new(id: 1)}

  describe "#polls" do
    specify { expect {subject.polls}.not_to raise_error }
  end

  describe "#recommendations" do
    specify { expect {subject.recommendations}.not_to raise_error }

    it "is a relation to Recommendation" do
      expect(described_class.reflections["recommendations"].class_name).to eq(Recommendation.name)
    end
  end
end
