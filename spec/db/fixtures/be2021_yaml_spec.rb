require_relative "../../../db/fixtures/be2021_yaml"

RSpec.describe Db::Fixtures::Be2021Yaml do
  it "runs without error" do
    expect(subject.data).to be_an_instance_of(Hash)
  end

  it "has an array of constituencies" do
    data = subject.data
    expect(data.keys).to eq([:constituencies])
  end

  describe "each constituency" do
    subject do
      described_class.new.data[:constituencies]
    end

    specify do
      subject.map do |constituency|
        expect(constituency).to have_key(:name)
      end
    end

    specify do
      subject.map do |constituency|
        expect(constituency).to have_key(:ons_id)
      end
    end

    specify do
      subject.map do |constituency|
        expect(constituency).to have_key(:candidates)
      end
    end
  end
end
