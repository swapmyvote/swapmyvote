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

  # rubocop:disable Metrics/MethodLength
  def fullest_recommendations_for(constituency, party)
    rec_party_results = party_recommendations_for(constituency, party)
    rec_party_lookup = rec_party_results.each_with_object({}) do |rec, hash|
      hash[rec.site] = rec
    end

    rec_results = recommendations_for(constituency)
    rec_lookup = rec_results.each_with_object({}) do |rec, hash|
      hash[rec.site] = rec
    end

    recommendations_sites
        .sort { |(_k1, v1), (_k2, v2)| v1[:order] <=> v2[:order] }
        .each_with_object([]) do |(site, _attr), array|
      rec_party = rec_party_lookup[site]
      rec = rec_lookup[site]
      if rec_party
        array.push([:good, rec_party]) # we know the site recommended exactly this party
      elsif rec
        array.push([:bad, rec]) # we know the site make a recommendation, but not this party
      else
        array.push([:unknown, OpenStruct.new(site: site)]) # site did not offer a recommendation
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
