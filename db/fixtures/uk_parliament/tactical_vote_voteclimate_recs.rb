# This loads the tactical voting recommandations from voteclimate.uk
# into the recommendations table

require_relative "tactical_vote_voteclimate_csv"

class TacticalVoteVoteclimateRecs
  attr_reader :advisor

  SMV_CODES_BY_ADVICE_TEXT = {
    ld: :libdem,
    green: :green
  }

  def initialize
    @advisor = TacticalVoteVoteclimateCsv.new
  end

  # rubocop:disable Metrics/MethodLength
  def load
    parties_by_smv_code = Party.all.each_with_object({}) do |party, lookup|
      lookup[party.smv_code.to_sym] = party
    end

    current_ons_ids = Set.new(OnsConstituency.all.pluck(:ons_id))

    old_constituency = Set.new
    not_recognised = Set.new
    recommendations_count = 0

    advisor.data.each do |row|
      ons_id = row[:constituency_ons_id]

      unless current_ons_ids.include? ons_id
        # puts "\nIGNORING: Constituency lookup failed for #{row}."
        old_constituency.add(row)
        next
      end

      rec_key = { constituency_ons_id: ons_id, site: advisor.site }
      rec = Recommendation.find_or_initialize_by(rec_key)
      source_advice = row[:advice]

      # ------------------------------------------------------------------------

      canonical_advice = source_advice.strip.downcase.parameterize(separator: "_").to_sym
      party_smv_code = SMV_CODES_BY_ADVICE_TEXT[canonical_advice]

      if party_smv_code && parties_by_smv_code[party_smv_code]
        party = parties_by_smv_code[party_smv_code]
        rec.text = party.name
        rec.update_parties([party])
      else
        # if we can't turn it into a recommendation we must delete any existing entry
        unless rec.id.nil?
          rec.update_parties([]) # keep none, delete the rest
          rec.delete
          print "X" # to signify delete
        end

        not_recognised.add({ advice: source_advice, canonical_advice: canonical_advice })

        next
      end

      # ------------------------------------------------------------------------

      rec.save!
      recommendations_count += 1
      print "." # to signify update
    end

    puts "\n\nConstituency Recommentations uploaded: #{recommendations_count}"
    puts "Constituency ids discarded as not current #{old_constituency.size}" if old_constituency.size.positive?

    puts "\n\nVoting advice not recognised #{not_recognised.to_a}" if not_recognised.size.positive?
  end
end
