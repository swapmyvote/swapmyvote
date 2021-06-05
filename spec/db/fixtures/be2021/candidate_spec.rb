require_relative "../../../../db/fixtures/be2021/candidate"

RSpec.describe Db::Fixtures::Be2021::Candidate do
  describe ".all" do
    specify { expect(subject.all).to be_an_instance_of(Array) }
  end

  describe "each candidate" do
    specify do
      subject.all.map do |candidate|
        expect(candidate).to have_key(:name)
      end
    end

    specify do
      subject.all.map do |candidate|
        expect(candidate).to have_key(:party_name)
      end
    end

    specify do
      subject.all.map do |candidate|
        expect(candidate).to have_key(:constituency_ons_id)
      end
    end
  end
end
