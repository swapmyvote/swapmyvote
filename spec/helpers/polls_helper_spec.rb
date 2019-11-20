require "rails_helper"

RSpec.describe PollsHelper, type: :helper do
  describe "#poll_data_for" do
    let(:constituency) { Constituency.new(id: 11) }
    before do
      constituency.save!
      party = Party.create!(id: 22)
      Poll.create!(constituency_id: constituency.id, party_id: party.id, votes: 385.0)
    end

    specify { expect { helper.poll_data_for(constituency) }.not_to raise_error }
  end
end
