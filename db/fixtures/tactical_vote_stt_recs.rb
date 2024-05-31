# This loads the tactical voting recommandations from StopTheTories.vote
# into the recommendations table

require_relative("tactical_vote_stt_csv")
require_relative("mysociety_constituencies_csv")

class TacticalVoteSttRecs
  attr_reader :advisor, :mysoc_constituencies

  ACCEPTABLE_NON_PARTY_ADVICE = ["Heart"]
  ADVICE_TRANSLATION = { "Heart" => "Any" }

  def initialize
    @advisor = TacticalVoteCsv.new
    @mysoc_constituencies = MysocietyConstituenciesCsv.new
  end

  # rubocop:disable Metrics/MethodLength
  def load
    ons_id_by_mysoc_short_code = {}

    mysoc_constituencies.each do |constituency|
      ons_id_by_mysoc_short_code[constituency[:short_code]] = constituency[:ons_id]
    end

    not_recognised = Set.new

    advisor.data.each do |row|
      ons_id = ons_id_by_mysoc_short_code[row[:mysoc_short_code]]
      rec_key = { constituency_ons_id: ons_id, site: advisor.site }
      rec = Recommendation.find_or_initialize_by(rec_key)

      source_advice = row[:advice]
      advice_is_not_party = ACCEPTABLE_NON_PARTY_ADVICE.include?(source_advice)

      if advice_is_not_party
        rec.text = ADVICE_TRANSLATION[source_advice] || source_advice
        acceptable = !rec.text.nil?
      else
        rec.text = source_advice
        party_short_code = rec.party_short_code_from_text
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

      rec.link = advisor.link
      rec.save
      print "." # to signify update
    end

    puts "\n\nVoting advice not recognised #{not_recognised.to_a}" if not_recognised.size.positive?
  end
end
