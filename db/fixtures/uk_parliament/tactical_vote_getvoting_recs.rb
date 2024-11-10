# This loads the tactical voting recommandations from StopTheTories.vote
# into the recommendations table

require_relative "tactical_vote_getvoting_csv"

class TacticalVoteGetvotingRecs
  attr_reader :advisor

  ACCEPTABLE_NON_PARTY_ADVICE = [
    :vote_with_your_heart
    # , :none
  ]
  SMV_CODES_BY_ADVICE_TEXT = {
    vote_labour: :lab,
    vote_snp: :snp,
    vote_lib_dem: :libdem,
    vote_plaid_cymru: :plaid,
    vote_green: :green
  }

  def initialize
    @advisor = TacticalVoteGetvotingCsv.new
  end

  # rubocop:disable Metrics/MethodLength
  def load
    parties_by_smv_code = Party.all.each_with_object({}) do |party, lookup|
      lookup[party.smv_code.to_sym] = party
    end

    included_heart_parties = Party.where.not({ smv_code: [:con, :reform] }).all

    not_recognised = Set.new

    advisor.data.each do |row|
      ons_id = row[:constituency_ons_id]

      unless ons_id
        puts "\nIGNORING: Constituency lookup failed for #{row}."
        next
      end

      rec_key = { constituency_ons_id: ons_id, site: advisor.site }
      rec = Recommendation.find_or_initialize_by(rec_key)
      source_advice = row[:advice]

      # ------------------------------------------------------------------------

      canonical_advice = source_advice.strip.downcase.parameterize(separator: "_").to_sym
      party_smv_code = SMV_CODES_BY_ADVICE_TEXT[canonical_advice]
      non_party_advice = ACCEPTABLE_NON_PARTY_ADVICE.include?(canonical_advice) ? canonical_advice : nil

      if party_smv_code && parties_by_smv_code[party_smv_code]
        party = parties_by_smv_code[party_smv_code]
        rec.text = party.name
        rec.update_parties([party])
      elsif non_party_advice && non_party_advice == :vote_with_your_heart
        rec.text = source_advice
        rec.update_parties(included_heart_parties)
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
      print "." # to signify update
    end

    puts "\n\nVoting advice not recognised #{not_recognised.to_a}" if not_recognised.size.positive?
  end
end
