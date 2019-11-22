require "spec_helper"
require_relative "../../app/lib/name_redactor"

RSpec.describe NameRedactor do
  subject { described_class.redact(name) }

  context "when the name has two ASCII parts" do
    let(:name) { "Bob Smith" }
    it "returns the first name and first initial of second name" do
      expect(subject).to eq("Bob S")
    end
  end

  context "when there is leading ASCII space" do
    let(:name) { "  Bob Smith" }
    it "skips the space" do
      expect(subject).to eq("Bob S")
    end
  end

  context "when there is leading non-ASCII space" do
    let(:name) { "　　Bob Smith" }
    it "skips the space" do
      expect(subject).to eq("Bob S")
    end
  end

  context "when the name has multiple ASCII parts" do
    let(:name) { "Melissa Auf der Maur" }
    it "returns the first name and first initial of second name" do
      expect(subject).to eq("Melissa A")
    end
  end

  context "when the name has only one part" do
    let(:name) { "Teller" }
    it "returns the name" do
      expect(subject).to eq(name)
    end

    context "and it is surrounded by ASCII space" do
      let(:name) { "  Teller  " }
      it "strips the surrounding space" do
        expect(subject).to eq("Teller")
      end
    end

    context "and it is surrounded by non-ASCII space" do
      let(:name) { "　　Teller　　" }
      it "strips the surrounding space" do
        expect(subject).to eq("Teller")
      end
    end
  end

  context "when the name is in a non-Latin script" do
    context "and there is no space" do
      let(:name) { "山田太郎" }
      it "returns the whole name" do
        expect(subject).to eq(name)
      end
    end

    context "and there is an ASCII space" do
      let(:name) { "山田 太郎" }
      it "returns the first name and first character of second name" do
        expect(subject).to eq("山田 太")
      end
    end

    context "and there is a non-ASCII space" do
      let(:name) { "山田　太郎" }
      it "returns the first name and first character of second name" do
        expect(subject).to eq("山田 太")
      end
    end
  end

  context "when there is a diacritic on the initial" do
    context "and the diacritic is precombined" do
      let(:name) { "Dara \u00D3 Briain" }
      it "returns the first name and first grapheme cluster of second name" do
        expect(subject).to eq("Dara Ó")
      end
    end

    context "and the diacritic is combining" do
      let(:name) { "Dara O\u0301 Briain" }
      it "returns the first name and first grapheme cluster of second name" do
        expect(subject).to eq("Dara Ó")
      end
    end
  end

  context "when the name is nil" do
    let(:name) { nil }
    it "returns nil" do
      expect(subject).to be_nil
    end
  end
end
