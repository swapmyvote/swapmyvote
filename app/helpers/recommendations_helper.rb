module RecommendationsHelper
  def recommendations_data_for(constituency)
    data = []
    constituency.recommendations.sort_by {|r| r.site}.each do |recommendation|
      data.push recommendation.as_json
    end
    return data.to_json.html_safe
  end

  def recommendations_sites
    {
      "avaaz-votesmart" => {},
      "get-voting" => {} ,
      "one-uk" => {},
      "peoples-vote" => {},
      "remain-united" => {},
      "tactical-vote" => {},
      "tacticalvote-co-uk" => {},
      "unite-2-leave" => {}
    }
  end

end
