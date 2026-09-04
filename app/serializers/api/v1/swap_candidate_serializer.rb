module Api
  module V1
    # Someone you could swap with, as _swap_profile_inner draws them.
    #
    # `name` is deliberately `redacted_name`: every pre-confirmation view in
    # the legacy site redacts, and only users/show/_swap_confirmed shows a real
    # name. No email address ever appears here — disclosing one is a separate,
    # consented step handled by SwapDetailSerializer.
    #
    # Polls and recommendations arrive through `params` rather than being read
    # off the user, because both are computed in one pass across every
    # candidate (see Api::V1::SwapCandidateData).
    class SwapCandidateSerializer
      include Alba::Resource

      transform_keys :lower_camel

      attributes :image_url

      attribute :user_id do |user|
        user.id
      end

      attribute :name do |user|
        user.redacted_name
      end

      attribute :constituency_name do |user|
        user.constituency&.name
      end

      attribute :constituency_ons_id do |user|
        user.constituency&.ons_id
      end

      # The four icons in _swap_profile_inner. `provider` is nil for an
      # email-only account, "twitter" or "facebook" otherwise.
      attribute :badges do |user|
        {
          mobileVerified: user.mobile_phone_verified? || false,
          provider: user.provider,
          hasEmail: user.email.present?
        }
      end

      one :preferred_party, resource: PartySerializer
      one :willing_party, resource: PartySerializer

      many :polls,
           resource: PollSerializer,
           source: ->(params) { params[:polls_by_user].fetch(id, []) }

      many :recommendations,
           resource: SwapRecommendationSerializer,
           source: ->(params) { params[:recommendations_by_user].fetch(id, []) }
    end
  end
end
