require_relative "../fixtures/livefrombrexit_recommendations_json"

class RecommendationsRefreshDec01 < ActiveRecord::Migration[5.2]
  # rubocop:disable Metrics/MethodLength
  def up_disabled
    json = LivefrombrexitRecommendationsJson.new

    timestamp = DateTime.now

    before_count = Recommendation.count

    puts "#{before_count} records before update"

    json.each do |rec_as_hash|
      rec = Recommendation.find_or_initialize_by(rec_as_hash.slice("site", "constituency_ons_id"))
      rec.text = rec_as_hash["recommendation"]
      rec.link = rec_as_hash["link"]
      rec.updated_at = timestamp
      rec.save!
      print "."
    end
    puts

    puts "#{Recommendation.count} records after update"

    select_untouched = Recommendation.where.not(updated_at: timestamp)

    untouched_count = select_untouched.count

    puts "#{untouched_count} records untouched"

    if untouched_count > before_count / 3
      raise "something went very wrong here, more than a third of records not included in this update?"
    end

    select_untouched.delete_all

    puts "#{Recommendation.count} records after deleting untouched"
  end

  def down
    puts "Manual down migration: check out older version of the code and run rake db:seed"
  end
end
