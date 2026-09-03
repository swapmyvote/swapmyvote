module Api
  module V1
    # The whole current swap, as the dashboard needs it — everything the thin
    # SwapSerializer on the session payload deliberately leaves out.
    #
    # `params[:viewer]` is the user asking, and decides three things: which
    # side of the swap this is, whose consent column `consent_given` reads,
    # and which user is "the partner".
    #
    # Two disclosure rules live here rather than in a view, so no future caller
    # can forget them:
    #
    #   * the partner's real name is only serialized once the swap is
    #     confirmed — every pre-confirmation HAML view calls `redacted_name`;
    #   * the partner's contact details are only serialized when *they* have
    #     consented to share, which is what UsersHelper#contact_methods checks
    #     before printing an address.
    class SwapDetailSerializer
      include Alba::Resource
      include SwapsHelper

      transform_keys :lower_camel

      attributes :id

      attribute :confirmed do |swap|
        swap.confirmed || false
      end

      # Keyed off `chosen_user` rather than `choosing_user`: `chosen_user` is a
      # belongs_to on the swap itself, always readable, while `choosing_user` is
      # a has_one over `users.swap_id` and reads nil for any swap whose chooser
      # has not been saved since.
      attribute :state do |swap|
        swap.chosen_user == params[:viewer] ? "incoming" : "outgoing"
      end

      # The viewer's own consent, which is what the three consent forms branch
      # on: the chooser's lives in consent_share_email_chooser, the chosen
      # user's in consent_share_email_chosen.
      attribute :consent_given do |swap|
        if swap.chosen_user == params[:viewer]
          swap.consent_share_email_chosen || false
        else
          swap.consent_share_email_chooser || false
        end
      end

      # "If we don't hear back from them in N hours, we'll cancel the swap" —
      # config, not swap state, but the outgoing view needs it and this keeps
      # the dashboard on one request.
      attribute :validity_hours do |_swap|
        swap_validity_hours
      end

      one :partner,
          resource: SwapPartnerDetailSerializer,
          source: ->(params) { chosen_user == params[:viewer] ? choosing_user : chosen_user }
    end
  end
end
