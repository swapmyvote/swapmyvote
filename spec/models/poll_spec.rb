require "rails_helper"

RSpec.describe Poll, type: :model do
  describe "#constituency" do
    context "with poll with no constituency id" do
      let(:no_constituency_poll) { Poll.new(votes: 987) }

      it "is nil" do
        expect(no_constituency_poll.constituency).to be_nil
      end
    end

    context "with poll with constituency id" do
      let(:constituency) { OnsConstituency.create!(name: "test con 2 for polls", ons_id: "a-fake-ons-id") }
      let(:poll) { Poll.new(votes: 654, constituency_ons_id: constituency.ons_id) }

      it "is expected constituency" do
        expect(poll.constituency).to eq(constituency)
      end
    end
  end
end
