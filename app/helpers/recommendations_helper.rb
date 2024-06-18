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
    rec_party_lookup = rec_party_results.each_with_object({}) { |rec, hash| hash[rec.site] = rec }

    rec_results = recommendations_for(constituency)
    rec_lookup = rec_results.each_with_object({}) { |rec, hash| hash[rec.site] = rec }

    recommendation_site_models_in_order.each_with_object([]) do |site, array|
      rec_party = rec_party_lookup[site.id]
      rec = rec_lookup[site.id]

      if rec_party && rec
        # we know the site recommended exactly this party
        array.push(OpenStruct.new({
          match: :good,
          site: site,
          recommendation: rec,
          recommendation_party: rec_party
        }))
      elsif rec
        # we know the site make a recommendation, but not this party
        array.push(OpenStruct.new({
          match: :bad,
          site: site,
          recommendation: rec
        }))
      else
        # site did not offer a recommendation
        array.push(OpenStruct.new({
          match: :unknown,
          site: site
        }))
      end
    end
  end

  def recommendation_site_models_in_order
    # doing our best to emulate activeRecord model here
    recommendations_sites
        .sort { |(_a_site_id, a_attributes), (_b_site_id, b_attributes)| a_attributes[:order] <=> b_attributes[:order] }
        .map { |site_id, attributes| OpenStruct.new(attributes.merge(id: site_id)) }
  end

  def recommendations_sites
    {
      "stop-the-tories" => {
        order: 1 ,
        link: "https://stopthetories.vote/"
      },
      "sprint-for-pr" => {
        order: 2,
        link: "https://sprintforpr.uk/plan"
      },
        "tactical-vote" => {
          order: 3,
          link: "https://tactical.vote/all/"
      },
      "scotland-in-union" => {
          order: 4,
          link: "https://scotlandinunion.co.uk/"
      },
      "tacticalvote-co-uk" => {
          order: 5,
          link: "https://tacticalvote.co.uk/"
      },
      "get-voting-org" => {
          order: 6,
          link: "https://getvoting.org/"
      }
    }
  end
end
