require_relative "../../../../db/fixtures/be2022/candidate"

RSpec.describe Db::Fixtures::Be2022::Candidate do
  # rubocop's recommendation doesn't improve the code in this instance and it worsens the spec output

  subject { described_class.all }

  describe ".all" do
    specify { expect(subject).to be_an_instance_of(Array) }

    describe "each candidate" do
      specify { subject.each { |candidate| expect(candidate).to have_key(:name) } }
      specify { subject.each { |candidate| expect(candidate).to have_key(:party_name) } }
      specify { subject.each { |candidate| expect(candidate).to have_key(:constituency_ons_id) } }
    end
  end
end
