module RecommendationsHelper
  def recommendations_for(constituency)
    data = []
    constituency
        .recommendations
        .sort{ |a, b| recommendations_sites[a.site][:order] <=> recommendations_sites[b.site][:order] }
        .each do |recommendation|
      data.push recommendation
    end
    return data
  end

  def recommendations_sites
    {
      "get-voting" => { order: 1 },
      "peoples-vote" => { order: 2 },
      "remain-united" => { order: 3 },
      "tacticalvote-co-uk" => { order: 4 },
      "tactical-vote" => { order: 5 },
      "avaaz-votesmart" => { order: 6 },
      "one-uk" => { order: 7 },
      "unite-2-leave" => { order: 8 }
    }
  end
end
