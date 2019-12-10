require "rails_helper"

RSpec.describe Recommendation, type: :model do
  describe "#constituency" do
    specify { expect {subject.constituency}.not_to raise_error }

    it "is a relation to OnsConstituency" do
      expect(described_class.reflections["constituency"].class_name).to eq(OnsConstituency.name)
    end
  end

  describe "with real names from the livefrombrexit json" do
    {
      "LibDem"        => { short_code: "libdem", short_name: "LD" },
      "Lib Dem"       => { short_code: "libdem", short_name: "LD" },
      "Lib Dems"      => { short_code: "libdem", short_name: "LD" },
      "LD"            => { short_code: "libdem", short_name: "LD" },
      "Labour"        => { short_code: "lab", short_name: "Lab" },
      "Green Party"   => { short_code: "green", short_name: "Green" },
      "Conservatives" => { short_code: "con", short_name: "Con" },
      "UKIP"          => { short_code: "ukip", short_name: "UKIP" },
      "SNP"           => { short_code: "snp", short_name: "SNP" },
      "Plaid Cymru"   => { short_code: "plaid", short_name: "Plaid" },
      "PC"            => { short_code: "plaid", short_name: "Plaid" },
      "Brexit"        => { short_code: "brexit", short_name: "BXP" },
      "BXP"           => { short_code: "brexit", short_name: "BXP" },
      "random string" => { short_name: "random string" }
    }.each do |(text, expected_value)|
      context "when text is #{text.inspect} " do
        describe "#party_short_code_from_text" do
          specify do
            expect(described_class.new(text: text).party_short_code_from_text)
              .to eq(expected_value[:short_code]&.to_sym)
          end
        end
        describe "#party_short_name_from_text" do
          specify do
            expect(described_class.new(text: text).party_short_name_from_text)
              .to eq(expected_value[:short_name])
          end
        end
      end
    end
  end

  describe "#party_style_from_text" do
    Party.short_codes.each do |short_code|
      describe "for party \"#{short_code.titlecase}\"" do
        specify { expect(Recommendation.new(text: short_code).party_style_from_text).not_to be_nil }
        specify { expect(Recommendation.new(text: short_code).party_style_from_text).not_to eq("") }
      end
    end

    describe "for text not matching a party" do
      specify { expect(Recommendation.new(text: "combustible edison").party_style_from_text).not_to be_nil }
      specify { expect(Recommendation.new(text: "combustible edison").party_style_from_text).not_to eq("") }
    end
  end
end
