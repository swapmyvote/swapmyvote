# This loads the tactical voting recommandations from StopTheTories.vote
# into the recommendations table

require_relative("tactical_vote_stt_csv")
require_relative("mysociety_constituencies_csv")

class TacticalVoteSttRecs
  attr_reader :advisor, :mysoc_constituencies

  ACCEPTABLE_NON_PARTY_ADVICE = ["Heart"]

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
      rec.text = row[:advice]

      party_short_code = rec.party_short_code_from_text
      acceptable = party_short_code || ACCEPTABLE_NON_PARTY_ADVICE.include?(rec.text)

      if rec.text == "" || !acceptable
        # if it's not acceptable, or blank we must delete the existing entry
        unless rec.id.nil?
          rec.delete
          print "X" # to signify delete
        end

        not_recognised.add({ advice: rec.text, party_short_code: party_short_code }) if rec.text != "" && !acceptable

        next
      end

      rec.link = advisor.link
      rec.save
      print "." # to signify update
    end

    puts "Voting advice not recognised #{not_recognised.to_a}" if not_recognised.size.positive?
  end
end
