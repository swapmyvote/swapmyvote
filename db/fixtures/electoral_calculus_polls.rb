# This loads the electoral calculus poll predictions into the polls table

require_relative "electoral_calculus_polls_raw"

class ElectoralCalculusPolls
  attr_reader :polls_data

  def initialize
    @polls_data = ElectoralCalculusConstituenciesPollsRaw.new
  end

  def load
    polls_data.each do |party_result|
      vote_count = (party_result[:vote_percent] * 100).to_i
      ons_id = party_result[:constituency_ons_id]
      party_id = party_result[:party_id]
      conversion_note = party_result[:conversion_note]

      unless conversion_note.nil?
        puts "\nConversion Note: #{party_result} "
      end

      poll = Poll.find_or_initialize_by constituency_ons_id: ons_id, party_id: party_id
      poll.votes = vote_count
      poll.save!
      print "."
    end
  end
end
