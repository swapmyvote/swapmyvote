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
