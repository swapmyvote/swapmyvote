require_relative "../../../db/fixtures/be2022_yaml"

RSpec.describe Db::Fixtures::Be2022Yaml do
  # rubocop's recommendation doesn't improve the code in this instance and it worsens the spec output

  subject { described_class.data }

  it "returns data as a hash" do
    expect(subject).to be_an_instance_of(Hash)
  end

  it "has an array of constituencies" do
    expect(subject.keys).to eq([:constituencies])
    expect(subject[:constituencies]).to be_an_instance_of(Array)
  end

  describe "each constituency" do
    subject { described_class.data[:constituencies] }

    specify { subject.each { |constituency| expect(constituency).to have_key(:name) } }
    specify { subject.each { |constituency| expect(constituency).to have_key(:ons_id) } }
    specify { subject.each { |constituency| expect(constituency).to have_key(:candidates) } }
  end
end
