require "rails_helper"

RSpec.describe Party, type: :model do
  it { is_expected.to respond_to :color }
  it { is_expected.to respond_to :name }
  it { is_expected.to respond_to :polls }

  describe "#standing_in" do
    context "Plaid" do
      subject { described_class.new(smv_code: :plaid) }

      it "returns true for welsh constituency" do
        expect(subject.standing_in("Wzzzzz")).to be_truthy
      end

      it "returns false for english constituency" do
        expect(subject.standing_in("Ezzzzz")).to be_falsy
      end

      it "returns false for scottish constituency" do
        expect(subject.standing_in("Szzzzz")).to be_falsy
      end

      it "returns false for NI constituency" do
        expect(subject.standing_in("Nzzzzz")).to be_falsy
      end
    end

    context "SNP" do
      subject { described_class.new(smv_code: :snp) }

      it "returns false for welsh constituency" do
        expect(subject.standing_in("Wzzzzz")).to be_falsy
      end

      it "returns false for english constituency" do
        expect(subject.standing_in("Ezzzzz")).to be_falsy
      end

      it "returns true for scottish constituency" do
        expect(subject.standing_in("Szzzzz")).to be_truthy
      end

      it "returns false for NI constituency" do
        expect(subject.standing_in("Nzzzzz")).to be_falsy
      end
    end

    context "some other party" do
      subject { described_class.new(smv_code: :elephants_are_super) }

      it "returns true for welsh constituency" do
        expect(subject.standing_in("Wzzzzz")).to be_truthy
      end

      it "returns true for english constituency" do
        expect(subject.standing_in("Ezzzzz")).to be_truthy
      end

      it "returns true for scottish constituency" do
        expect(subject.standing_in("Szzzzz")).to be_truthy
      end

      it "returns true for NI constituency" do
        expect(subject.standing_in("Nzzzzz")).to be_truthy
      end
    end
  end
end
