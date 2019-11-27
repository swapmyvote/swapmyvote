module RecommendationsHelper
  def recommendations_data_for(constituency)
    data = []
    constituency.recommendations.sort_by {|r| r.site}.each do |recommendation|
      data.push recommendation.as_json
    end
    return data.to_json.html_safe
  end
end
