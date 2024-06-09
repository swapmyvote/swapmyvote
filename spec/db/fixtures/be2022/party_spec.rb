require_relative "../../../../db/fixtures/be2022/party"

RSpec.describe Db::Fixtures::Be2022::Party do
  # rubocop's recommendation doesn't improve the code in this instance and it worsens the spec output

  describe ".all_with_duplicates" do
    subject { described_class.all_with_duplicates }

    specify { expect(subject).to be_an_instance_of(Array) }

    it "has more than 1 party" do
      expect(subject.size).to be > 1
    end

    describe "each party" do
      specify { subject.each { |party| expect(party).to have_key(:name) } }
      specify { subject.each { |party| expect(party).to have_key(:colour) } }
    end
  end

  describe ".all" do
    subject { described_class.all }

    specify { expect(subject).to be_an_instance_of(Array) }

    it "has less parties than .all_with_duplicates" do
      expect(subject.size).to be < described_class.all_with_duplicates.size
    end

    it "has more than 1 party" do
      expect(subject.size).to be > 1
    end

    describe "each party" do
      specify { subject.each { |party| expect(party).to have_key(:name) } }
      specify { subject.each { |party| expect(party).to have_key(:colour) } }
    end
  end
end
