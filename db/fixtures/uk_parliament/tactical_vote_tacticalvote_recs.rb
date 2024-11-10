# This loads the tactical voting recommandations from tactical.vote
# into the recommendations table

require_relative "tactical_vote_tacticalvote_csv"
require_relative "mysociety_constituencies_csv"

class TacticalVoteTacticalVoteRecs
  attr_reader :advisor, :mysoc_constituencies

  ACCEPTABLE_NON_PARTY_ADVICE = [:alliance, :sinn_fein, :social_democratic_and_labour_party]
  SMV_CODES_BY_ADVICE_TEXT = {
    liberal_democrat: :libdem,
    lib_dem: :libdem,
    labour: :lab,
    plaid_cymru: :plaid,
    plaid: :plaid,
    green: :green,
    scottish_national_party: :snp,
    snp: :snp
  }

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

    parties_by_smv_code = Party.all.each_with_object({}) do |party, lookup|
      lookup[party.smv_code.to_sym] = party
    end

    not_recognised = Set.new

    advisor.data.each do |row|
      ons_id = ons_id_by_mysoc_name[row[:constituency_name]]

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
      elsif non_party_advice
        # actually, here we mean a party not in our database so we can't link to a party record
        rec.text = source_advice
        rec.update_parties([]) # delete anything
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
