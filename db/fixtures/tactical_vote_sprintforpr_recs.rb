# This loads the tactical voting recommandations from SprintForPR.uk
# into the recommendations table

require_relative "tactical_vote_sprintforpr_csv"
require_relative "mysociety_constituencies_csv"

class TacticalVoteSprintforprRecs
  ACCEPTABLE_NON_PARTY_ADVICE = []
  attr_reader :advisor, :mysoc_constituencies

  def initialize
    @advisor = TacticalVoteSprintforprCsv.new
    @mysoc_constituencies = MysocietyConstituenciesCsv.new
  end

  # rubocop:disable Metrics/MethodLength
  def load
    ons_id_by_mysoc_name = {}

    mysoc_constituencies.each do |constituency|
      # puts constituency
      ons_id_by_mysoc_name[constituency[:name]] = constituency[:ons_id]
    end

    not_recognised = Set.new

    advisor.data.each do |row|
      ons_id = ons_id_by_mysoc_name[row[:constituency_name]]
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

    puts "\n\nVoting advice not recognised #{not_recognised.to_a}" if not_recognised.size.positive?
  end
end
