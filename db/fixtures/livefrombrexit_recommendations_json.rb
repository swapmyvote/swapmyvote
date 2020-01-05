# This encapsulates access to the tactical voting recommendations
# aggregated by the livefrombrexit site.
# The normal update process is to
# visit the url
# https://www.livefrombrexit.com/tacticals/data/recommendations.json
# and save the result to the file referenced below in the private
# method 'data'.

class LivefrombrexitRecommendationsJson
  include Enumerable

  def unique_sites
    return @unique_sites if defined?(@unique_sites)

    @unique_sites = constituencies.each_with_object(Set.new) do |constituency, set|
      constituency["recs"].each do |rec|
        set << rec["site"]
      end
    end.entries

    return @unique_sites
  end

  def unique_recommendation
    return @unique_recommendation if defined?(@unique_recommendation)

    @unique_recommendation = constituencies.each_with_object(Set.new) do |constituency, set|
      constituency["recs"].each do |rec|
         text = rec["recommendation"]
        # text.split(" ").each do |one_rec|
        #   set << one_rec
        # end
         set << text
       end
    end.entries

    return @unique_recommendation
  end

  def each
    constituencies.each do |constituency|
      ons_id = constituency["onsId"]
      constituency["recs"].each do |rec|
        recommendation = rec.merge("constituency_ons_id" => ons_id)
        yield recommendation
      end
    end
  end

  def updated
    data["updated"]
  end

  def sites
    data["tacticalSites"]
  end

  def constituencies
    data["constituencies"]
  end

  private def data
    return @data if defined?(@data)

    file = File.open "db/fixtures/livefrombrexit_recommendations.json"

    @data = JSON.load file
    return @data
  end
end
