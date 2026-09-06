module Api
  module V1
    # The *other* side of a swap, as shown on the session payload. Strictly
    # less than UserSerializer: no id, no email (sharing an email address is a
    # separate, explicitly consented step in the swap flow), and — unlike
    # SwapPartnerDetailSerializer — no name either. The session poll has no
    # `swap_confirmed` gate to redact it with, and every mutation response
    # nests a fresh SwapPartnerDetailSerializer's *redacted* name under
    # `swap.partner.name` right alongside this serializer's output under
    # `session.swap.partner`, so a real name here would sit next to a
    # redacted one in the same response. Nothing in the SPA reads this
    # field; if that changes, gate it on `params[:swap_confirmed]` the same
    # way SwapPartnerDetailSerializer does, don't just unredact it.
    class SwapPartnerSerializer
      include Alba::Resource

      transform_keys :lower_camel

      attributes :image_url

      attribute :constituency_name do |user|
        user.constituency&.name
      end
    end
  end
end
