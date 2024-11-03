require_relative "../../db/fixtures/uk_parliament/livefrombrexit_recommendations_json"

class Recommendation < ApplicationRecord
  belongs_to :constituency,
             class_name: "OnsConstituency",
             primary_key: "ons_id",
             foreign_key: "constituency_ons_id"

  LFB_DEFAULT_STYLE = "background-color: rgba(204, 204, 204, 0.4); color: rgb(132, 132, 132);"

  def party_short_code_from_text
    canonical_text_sym = text.downcase.parameterize(separator: "_").to_sym
    return canonical_text_sym if Party::REFERENCE_DATA.keys.include?(canonical_text_sym)
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
end
