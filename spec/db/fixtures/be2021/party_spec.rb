require_relative "../../../../db/fixtures/be2021/party"

RSpec.describe Db::Fixtures::Be2021::Party do
  describe ".all_with_duplicates" do
    subject { described_class.new.all_with_duplicates }

    specify { expect(subject).to be_an_instance_of(Array) }

    it "has more than 1 party" do
      expect(subject.size).to be > 1
    end

    describe "each party" do
      specify do
        subject.map do |party|
          expect(party).to have_key(:name)
        end
      end

      specify do
        subject.map do |party|
          expect(party).to have_key(:colour)
        end
      end
    end
  end

  describe ".all" do
    subject { described_class.new.all }

    specify { expect(subject).to be_an_instance_of(Array) }

    it "has less parties than .all_with_duplicates" do
      expect(subject.size).to be < described_class.new.all_with_duplicates.size
    end

    it "has more than 1 party" do
      expect(subject.size).to be > 1
    end

    describe "each party" do
      specify do
        subject.map do |party|
          expect(party).to have_key(:name)
        end
      end

      specify do
        subject.map do |party|
          expect(party).to have_key(:colour)
        end
      end
    end
  end
end
