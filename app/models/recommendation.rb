require_relative "../../db/fixtures/livefrombrexit_recommendations_json"

class Recommendation < ApplicationRecord
  belongs_to :constituency,
             class_name: "OnsConstituency",
             primary_key: "ons_id",
             foreign_key: "constituency_ons_id"

  # rubocop:disable Metrics/MethodLength
  class << self
    def refresh_from_json(progress: false)
      json = LivefrombrexitRecommendationsJson.new

      timestamp = DateTime.now
      before_count = Recommendation.count
      puts "#{before_count} records before update" if progress

      json.each do |rec_as_hash|
        rec = Recommendation.find_or_initialize_by(rec_as_hash.slice("site", "constituency_ons_id"))
        rec.text = rec_as_hash["recommendation"]
        rec.link = rec_as_hash["link"]
        rec.updated_at = timestamp
        rec.save!
        print "."  if progress
      end
      puts if progress

      puts "#{Recommendation.count} records after update"  if progress
      select_untouched = Recommendation.where(["updated_at <> ?", timestamp])
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
