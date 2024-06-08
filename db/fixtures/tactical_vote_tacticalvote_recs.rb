# This loads the tactical voting recommandations from tactical.vote
# into the recommendations table

require_relative "tactical_vote_tacticalvote_csv"
require_relative "mysociety_constituencies_csv"

class TacticalVoteTacticalVoteRecs
  ACCEPTABLE_NON_PARTY_ADVICE = []
  ADVICE_TRANSLATION = {}

  attr_reader :advisor, :mysoc_constituencies

  def initialize
    @advisor = TacticalVoteTacticalVoteCsv.new
    @mysoc_constituencies = MysocietyConstituenciesCsv.new
  end

  # rubocop:disable Metrics/MethodLength
  def load
    ons_id_by_mysoc_name = {}

    mysoc_constituencies.each do |constituency|
      ons_id_by_mysoc_name[constituency[:name]] = constituency[:ons_id]
    end

    not_recognised = Set.new

    advisor.data.each do |row|
      ons_id = ons_id_by_mysoc_name[row[:constituency_name]]
      rec_key = { constituency_ons_id: ons_id, site: advisor.site }
      rec = Recommendation.find_or_initialize_by(rec_key)

      source_advice = row[:advice]
      advice_is_not_party = ACCEPTABLE_NON_PARTY_ADVICE.include?(source_advice)

      if advice_is_not_party
        rec.text = ADVICE_TRANSLATION[source_advice] || source_advice
        party_short_code = nil
        acceptable = !rec.text.nil?
      else
        rec.text = source_advice
        party_short_code = source_advice ? rec.party_short_code_from_text : nil
        acceptable = !party_short_code.nil?
      end

      if rec.text == "" || !acceptable
        # if it's not acceptable, or blank we must delete the existing entry
        unless rec.id.nil?
          rec.delete
          print "X" # to signify delete
        end

        not_recognised.add({ advice: source_advice }) if rec.text != "" && !acceptable

        next
      end

      if party_short_code
        rec.text = Recommendation::LFB_REFERENCE_DATA[party_short_code][:short_name]
      end

      rec.link = advisor.link
      rec.save
      print "." # to signify update
    end

    puts "\n\nVoting advice not recognised #{not_recognised.to_a}" if not_recognised.size.positive?
  end
end
