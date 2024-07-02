require_relative "../fixtures/livefrombrexit_recommendations_json"

class PopulateRecommendations < ActiveRecord::Migration[5.2]
  def up_disabled
    json = LivefrombrexitRecommendationsJson.new

    json.each do |rec_as_hash|
      rec = Recommendation.find_or_initialize_by(rec_as_hash.slice("site", "constituency_ons_id"))
      rec.text = rec_as_hash["recommendation"]
      rec.link = rec_as_hash["link"]
      rec.save!
      print "."
    end
    puts
  end

  def down
    # could do a delete ?
  end
end
