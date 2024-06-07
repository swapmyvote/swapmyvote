require "rails_helper"

RSpec.describe Party, type: :model do
  it { is_expected.to respond_to :color }
  it { is_expected.to respond_to :name }

  it { is_expected.to respond_to :polls }

  # refer to api docs at app/views/static_pages/api.html.haml
  describe ".canonical_names" do
    %w[
       labour
       liberal_democrats
       green
       conservatives
       reform
       ukip
    ].each do |canonical_name|
      it "includes #{canonical_name.inspect} mentioned in api docs" do
        expect(described_class.canonical_names).to include(canonical_name)
      end
    end
  end

  describe ".smv_codes" do
    %w[
      con
      lab
      libdem
      brexit
      green
      ukip
      snp
      plaid
    ].each do |short_code|
      it "includes #{short_code.inspect} used in mapping polls info" do
        expect(described_class.smv_codes).to include(short_code)
      end
    end
  end

  describe ".names" do
    [
      "Conservatives",
      "Green",
      "Labour",
      "Liberal Democrats",
      "UKIP",
      "SNP",
      "Plaid Cymru",
      "Brexit",
    ].each do |name|
      it "includes #{name.inspect} used in seeds scripts" do
        expect(described_class.names).to include(name)
      end
    end
  end
end
