# This loads the mrp average poll predictions into the polls table

require_relative "mrp_averages_polls_raw"

class MrpAveragesPolls
  attr_reader :polls_data

  def initialize
    @polls_data = MrpAveragesPollsRaw.new
  end

  def load
    polls_data.each do |party_result|
      vote_count = (party_result[:vote_percent] * 100).to_i
      ons_id = party_result[:constituency_ons_id]
      party_id = party_result[:party_id]
      poll = Poll.find_or_initialize_by constituency_ons_id: ons_id, party_id: party_id
      poll.votes = vote_count
      poll.save!
      print "."
    end
  end
end
