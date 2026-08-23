module Api
  module V1
    # A swap seen from one side. `params[:viewer]` is the user asking, which
    # decides whether this is their outgoing swap (they chose someone) or
    # their incoming one (someone chose them) — the two sides drive different
    # dashboard states and different confirm/cancel affordances.
    #
    # Deliberately thin: the session payload only needs enough to render the
    # chrome and the phase locks. The full swap resource (consent to share
    # email, partner contact details, ranking) lands with the swap flow.
    class SwapSerializer
      include Alba::Resource

      transform_keys :lower_camel

      attributes :id

      attribute :confirmed do |swap|
        swap.confirmed || false
      end

      attribute :state do |swap|
        swap.choosing_user == params[:viewer] ? "outgoing" : "incoming"
      end

      # `source` is instance_exec'd on the swap, so `choosing_user` /
      # `chosen_user` below are the swap's own associations.
      one :partner,
          resource: SwapPartnerSerializer,
          source: ->(params) { choosing_user == params[:viewer] ? chosen_user : choosing_user }
    end
  end
end
