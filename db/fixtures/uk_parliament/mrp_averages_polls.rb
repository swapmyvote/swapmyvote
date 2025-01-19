# This loads the mrp average poll predictions into the polls table

require_relative "mrp_averages_polls_raw"

class MrpAveragesPolls
  attr_reader :polls_data

  def initialize
    @polls_data = MrpAveragesPollsRaw.new
  end

  def load
    data = polls_data.map do |party_result|
      party_result.slice(:constituency_ons_id, :party_id).merge(
        votes: (party_result[:vote_percent] * 100).to_i,
        created_at: Time.current,
        updated_at: Time.current
      )
    end
    Poll.upsert_all(data, unique_by: %w[constituency_ons_id party_id])
  end
end
