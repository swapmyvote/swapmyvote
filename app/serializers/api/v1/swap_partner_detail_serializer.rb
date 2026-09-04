module Api
  module V1
    # The other side of a live swap: the candidate card, plus the two things a
    # candidate never has — a real name once confirmed, and contact details
    # once they have consented.
    #
    # Distinct from SwapPartnerSerializer, which is the thin version on the
    # session payload.
    class SwapPartnerDetailSerializer
      include Alba::Resource

      transform_keys :lower_camel

      attributes :image_url

      # Redacted until the swap is confirmed, matching every HAML view:
      # users/show/_swap_confirmed is the only one that prints a real name.
      attribute :name do |user|
        params[:swap_confirmed] ? user.name : user.redacted_name
      end

      attribute :constituency_name do |user|
        user.constituency&.name
      end

      attribute :constituency_ons_id do |user|
        user.constituency&.ons_id
      end

      attribute :badges do |user|
        {
          mobileVerified: user.mobile_phone_verified? || false,
          provider: user.provider,
          hasEmail: user.email.present?
        }
      end

      # Null until the swap is confirmed — offering or accepting a swap always
      # implies consent, so gating on consent alone would leak this while a
      # swap is still pending. Once confirmed, `email` additionally requires
      # this partner's own consent, but `profileUrl`/`provider`/
      # `facebookLogin` are unconditional: shared/_reach_out_to_swap and
      # UsersHelper#contact_methods disclose the social link regardless of
      # email consent.
      attribute :contact do |user|
        next nil unless params[:swap_confirmed]

        {
          email: user.consented_to_share_email? ? user.email.presence : nil,
          profileUrl: user.profile_url,
          provider: user.provider,
          facebookLogin: user.facebook_login?
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
