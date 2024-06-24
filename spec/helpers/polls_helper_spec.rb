require "rails_helper"

RSpec.describe PollsHelper, type: :helper do
  include Devise::Test::ControllerHelpers

  # fixtures :ons_constituencies, :polls

  describe "#poll_data_for" do
    context "with single party, single constituency" do
      let(:constituency) { build(:ons_constituency) }
      let(:party) { build(:party, name: "Pink") }
      let(:poll1) { build(:poll, party: party, constituency_ons_id: constituency.ons_id, votes: 4234)}

      before do
        constituency.save!
        poll1.save!
      end

      specify { expect { helper.poll_data_for(constituency) }.not_to raise_error }

      it "returns the party data with a short party name" do
        expect(helper.poll_data_for(constituency)).to match('"Pnk"')
      end

      context "and when votes count is zero" do
        before { poll1.update!(votes: 0)}

        it "does not return the party data" do
          expect(helper.poll_data_for(constituency)).not_to match('"Pnk"')
        end
      end
    end
  end
end
