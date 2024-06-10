require_relative "../../db/fixtures/livefrombrexit_recommendations_json"

class Recommendation < ApplicationRecord
  belongs_to :constituency,
             class_name: "OnsConstituency",
             primary_key: "ons_id",
             foreign_key: "constituency_ons_id"

  LFB_REFERENCE_DATA = {
    lab:    { style: "background-color: rgba(220, 36, 31, 0.4); color: rgb(134, 0, 0);", short_name: "Lab" },
    libdem: { style: "background-color: rgba(250, 166, 26, 0.4); color: rgb(166, 97, 0);", short_name: "LD" },
    green:  { style: "background-color: rgba(106, 176, 35, 0.4); color: rgb(24, 105, 0);", short_name: "Green" },
    con:    { style: "background-color: rgba(0, 135, 220, 0.4); color: rgb(0, 70, 146);", short_name: "Con" },
    ukip:   { style: "background-color: rgba(112, 20, 122, 0.4); color: rgb(36, 0, 38);", short_name: "UKIP" },
    snp:    { style: "background-color: rgba(240, 202, 62, 0.4); color: rgb(159, 130, 0);", short_name: "SNP" },
    plaid:  { style: "background-color: rgba(0, 129, 66, 0.4); color: rgb(0, 61, 3);", short_name: "Plaid" },
    brexit: { style: "background-color: rgba(18, 182, 207, 0.4); color: rgb(0, 111, 134);", short_name: "BXP" }
  }

  LFB_DEFAULT_STYLE = "background-color: rgba(204, 204, 204, 0.4); color: rgb(132, 132, 132);"

  LFB_NAMES_TO_SHORT_CODE = {
    bxp:           :brexit,
    pc:            :plaid,
    plaid_cymru:   :plaid,
    conservatives: :con,
    lib_dem:       :libdem,
    lib_dems:      :libdem,
    ld:            :libdem,
    labour:        :lab,
    green_party:   :green
  }

  def party_short_code_from_text
    canonical_text_sym = text.downcase.parameterize(separator: "_").to_sym
    return canonical_text_sym if Party::REFERENCE_DATA.keys.include?(canonical_text_sym)
    lfb_lookup = LFB_NAMES_TO_SHORT_CODE[canonical_text_sym]
    return lfb_lookup unless lfb_lookup.nil?
  end

  def party_style_from_text
    return party_attributes_from_text[:style]
  end

  def update_parties(parties)
    rec_key = { constituency_ons_id: constituency_ons_id, site: site }

    party_ids = parties.select{ |p| p.standing_in(constituency_ons_id) }.map(&:id)

    party_ids.each do |party_id|
      rec_party = RecommendedParty.find_or_initialize_by(rec_key.merge({ party_id: party_id }))
      rec_party.save!
      print "!" # to signify update with heart/any
    end

    RecommendedParty.where(rec_key).where.not(party_id: party_ids).all.find_each do |party|
      party.delete
      print "*" # to signify remove with heart/any
    end
  end

  private def party_attributes_from_text
    short_code = party_short_code_from_text
    return LFB_REFERENCE_DATA[short_code] || { style: LFB_DEFAULT_STYLE }
  end

  class << self
    def refresh_from_json(progress: false)
      json = LivefrombrexitRecommendationsJson.new

      with_sanity_checks(progress: progress) do |timestamp|
        json.each do |rec_as_hash|
          rec = Recommendation.find_or_initialize_by(rec_as_hash.slice("site", "constituency_ons_id"))
          rec.text = rec_as_hash["recommendation"]
          rec.link = rec_as_hash["link"]
          rec.updated_at = timestamp
          rec.save!
          print "."  if progress
        end
      end
    end

    def with_sanity_checks(progress: false, &block)
      timestamp = DateTime.now
      before_count = Recommendation.count
      puts "#{before_count} records before update" if progress

      block.call(timestamp)

      puts if progress
      puts "#{Recommendation.count} records after update"  if progress
      select_untouched = Recommendation.where.not(updated_at: timestamp)
      untouched_count = select_untouched.count
      puts "#{untouched_count} records untouched"  if progress

      if untouched_count > before_count / 3
        raise "something went very wrong here, more than a third of records not included in this update?"
      end

      select_untouched.delete_all
      puts "#{Recommendation.count} records after deleting untouched"  if progress
    end
  end
end
