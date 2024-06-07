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
      "LibDem"        => { short_code: "libdem" },
      "Lib Dem"       => { short_code: "libdem" },
      "Lib Dems"      => { short_code: "libdem" },
      "LD"            => { short_code: "libdem" },
      "Labour"        => { short_code: "lab" },
      "Green Party"   => { short_code: "green" },
      "Conservatives" => { short_code: "con" },
      "UKIP"          => { short_code: "ukip" },
      "SNP"           => { short_code: "snp" },
      "Plaid Cymru"   => { short_code: "plaid" },
      "PC"            => { short_code: "plaid" },
      "Brexit"        => { short_code: "brexit" },
      "BXP"           => { short_code: "brexit" },
      "random string" => { short_name: "random string" }
    }.each do |(text, expected_value)|
      context "when text is #{text.inspect} " do
        describe "#party_short_code_from_text" do
          specify do
            expect(described_class.new(text: text).party_short_code_from_text)
              .to eq(expected_value[:short_code]&.to_sym)
          end
        end
      end
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
