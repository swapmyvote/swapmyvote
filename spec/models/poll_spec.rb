require "rails_helper"

RSpec.describe Poll, type: :model do
  describe "#constituency" do
    context "with poll with no constituency id" do
      let(:no_constituency_poll) { described_class.new(votes: 987) }

      it "is nil" do
        expect(no_constituency_poll.constituency).to be_nil
      end
    end

    context "with poll with constituency id" do
      let(:constituency) { OnsConstituency.create!(name: "test con 2 for polls", ons_id: "a-fake-ons-id") }
      let(:poll) { described_class.new(votes: 654, constituency_ons_id: constituency.ons_id) }

      it "is expected constituency" do
        expect(poll.constituency).to eq(constituency)
      end
    end
  end

  describe ".calculate_marginal_score" do
    it "finds all constituencies" do
      expect(OnsConstituency).to receive(:all).and_return(double.as_null_object)
      described_class.calculate_marginal_score
    end

    context "on a single constituency, split 32.56%, 27.31%, 19.43%" do
      before do
        allow(OnsConstituency).to receive(:eager_load).and_return([constituency1])
        create(:ons_constituency)
      end

      let(:constituency1) { create(:ons_constituency, ons_id: "twenty-two", polls: [poll1, poll2, poll3]) }
      let(:poll1) { create(:poll, id: 12, votes: 3256, constituency: OnsConstituency.first, party: create(:party)) }
      let(:poll2) { create(:poll, id: 13, votes: 2731, constituency: OnsConstituency.first, party: create(:party)) }
      let(:poll3) { create(:poll, id: 14, votes: 1943, constituency: OnsConstituency.first, party: create(:party)) }

      describe "poll with 3256 votes" do
        specify do
          expect(poll1).to receive(:update).with(marginal_score: (poll1.votes - poll2.votes))
          described_class.calculate_marginal_score
        end
      end

      describe "poll with 2731 votes" do
        specify do
          expect(poll2).to receive(:update).with(marginal_score: (poll1.votes - poll2.votes))
          described_class.calculate_marginal_score
        end
      end

      describe "poll with 1943 votes" do
        specify do
          expect(poll3).to receive(:update).with(marginal_score: (poll1.votes - poll3.votes))
          described_class.calculate_marginal_score
        end
      end
    end
  end
end
