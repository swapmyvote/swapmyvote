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
      "tacticalvote-co-uk" => {
        order: 1,
        meta_desc: "Want to get the Tories out? Tactical Voting is the answer.",
        name: "Tactical Vote",
        link: "https://tacticalvote.co.uk/"
      },
      "stop-the-tories" => {
        order: 2,
        name: "Stop The Tories",
        meta_desc: "Your vote is your power. " + \
                   "Use it tactically to get the Tories out, then influence your new MP and the next government.",
        link: "https://stopthetories.vote/"
      },
      "get-voting-org" => {
        order: 3,
        meta_desc: "A tactical voting & voter informaton campaign from Best for Britain.",
        name: "Get Voting",
        link: "https://getvoting.org/"
      },
      "tactical-vote" => {
        order: 4,
        meta_desc: "How to vote tactically to get the Tories out in the 2024 General Election",
        name: "tactical.vote",
        link: "https://tactical.vote/all/"
      },
      "scotland-in-union" => {
        order: 5,
        meta_desc: "Campaigning to keep Scotland in the UK, challenging the independence agenda from the SNP",
        name: "Scotland in Union",
        link: "https://scotlandinunion.co.uk/"
      },
      "sprint-for-pr" => {
        order: 6,
        name: "Sprint for PR",
        meta_desc: "How and where to vote tactically in the next general election " + \
                   "to advocate for proportional representation",
        link: "https://sprintforpr.uk/plan"
      },
    }
  end
end
