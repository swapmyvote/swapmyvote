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

  def full_party_recommendations_for(constituency, party)
    rec_party_results = party_recommendations_for(constituency, party)

    rec_party_lookup = rec_party_results.each_with_object({}) do |rec, hash|
      hash[rec.site] = rec
    end

    recommendations_for(constituency).each_with_object([]) do |rec, array|
      rec_party = rec_party_lookup[rec.site]
      if rec_party
        array.push([:good, rec_party])
      else
        array.push([:bad, rec])
      end
    end
  end

  def recommendations_sites
    {
      "stop-the-tories" => { order: 1 },
      "sprint-for-pr" => { order: 2 },
      "tactical-vote" => { order: 3 }
    }
  end
end
