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

  def party_recommendations_for(constituency, party)
    data = []
    RecommendedParty.where(party_id: party.id, constituency_ons_id: constituency.ons_id).each do |recommendation|
      data.push recommendation
    end
    return data
  end

  def recommendations_sites
    {
      "stop-the-tories" => { order: 1 },
      "sprint-for-pr" => { order: 2 },
      "get-voting" => { order: 91 },
      "peoples-vote" => { order: 92 },
      "remain-united" => { order: 93 },
      "tacticalvote-co-uk" => { order: 94 },
      "tactical-vote" => { order: 95 },
      "avaaz-votesmart" => { order: 96 },
      "one-uk" => { order: 97 },
      "unite-2-leave" => { order: 98 }
    }
  end
end
