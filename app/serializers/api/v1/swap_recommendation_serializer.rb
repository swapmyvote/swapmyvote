module Api
  module V1
    # One tactical-voting site's verdict on a constituency, as
    # recommendations/_party_recommendation renders it.
    #
    # Serializes the OpenStructs RecommendationsHelper#fullest_recommendations_for
    # builds, which always covers every site — `unknown` means the site made no
    # recommendation there, and the partial says so rather than hiding the row.
    class SwapRecommendationSerializer
      include Alba::Resource

      transform_keys :lower_camel

      attribute :site_id do |rec|
        rec.site.id
      end

      attribute :site_name do |rec|
        rec.site.name
      end

      attribute :site_link do |rec|
        rec.site.link
      end

      attribute :site_meta_desc do |rec|
        rec.site.meta_desc
      end

      attribute :match do |rec|
        rec.match.to_s
      end

      # Null for :unknown, where there is no recommendation object to read.
      attribute :text do |rec|
        rec.recommendation&.text
      end
    end
  end
end
