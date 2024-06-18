# This loads the tactical voting recommandations from tacticalvote.co.uk
# into the recommendations table

require "json"

class TacticalVoteTacticalVoteCoUkRecs
  attr_reader :file_name, :site

  FILE_NAME = "db/fixtures/tactical_vote_tacticalvote_co_uk.json"

  ACCEPTABLE_NON_PARTY_ADVICE = [
    :alliance, :sinn_fein, :sdlp, :any, :tbc_labour_or_plaid_cymru, :labour_or_snp
  ]
  SMV_CODES_BY_ADVICE_TEXT = {
    lib_dem: :libdem,
    ld: :libdem,
    labour: :lab,
    plaid_cymru: :plaid,
    green: :green,
    snp: :snp
  }

  def initialize
    @site = "tacticalvote-co-uk"
    @file_name = FILE_NAME
  end

  # rubocop:disable Metrics/MethodLength
  def load
    advisor_json = File.read(file_name)
    advisor_data = JSON.parse(advisor_json)

    parties_by_smv_code = Party.all.each_with_object({}) do |party, lookup|
      lookup[party.smv_code.to_sym] = party
    end

    # tacticalvote.co.uk "Any" has been explained to me as the same as STT "heart", no tories, no reform
    included_any_parties = Party.where.not({ smv_code: [:con, :reform] }).all
    included_labour_or_snp_parties = Party.where({ smv_code: [:lab, :snp] }).all

    not_recognised = Set.new

    advisor_data.each do |row|
      ons_id = row["id"]

      unless ons_id
        puts "\nIGNORING: Constituency lookup failed for #{row}."
        next
      end

      rec_key = { constituency_ons_id: ons_id, site: site }
      rec = Recommendation.find_or_initialize_by(rec_key)
      source_advice = row["VoteFor"]

      # ------------------------------------------------------------------------

      canonical_advice = source_advice.strip.downcase.parameterize(separator: "_").to_sym
      party_smv_code = SMV_CODES_BY_ADVICE_TEXT[canonical_advice]
      non_party_advice = ACCEPTABLE_NON_PARTY_ADVICE.include?(canonical_advice) ? canonical_advice : nil

      if party_smv_code && parties_by_smv_code[party_smv_code]
        party = parties_by_smv_code[party_smv_code]
        rec.text = party.name
        rec.update_parties([party])
      elsif non_party_advice && non_party_advice == :any
        rec.text = "Any"
        rec.update_parties(included_any_parties)
      elsif non_party_advice && non_party_advice == :labour_or_snp
        rec.text = source_advice
        rec.update_parties(included_labour_or_snp_parties)
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
