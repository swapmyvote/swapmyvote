module Api
  module V1
    # The *other* side of a swap, as shown to their partner. Strictly less than
    # UserSerializer: no id, no email (sharing an email address is a separate,
    # explicitly consented step in the swap flow) — just what's needed to say
    # who you're swapping with.
    class SwapPartnerSerializer
      include Alba::Resource

      transform_keys :lower_camel

      attributes :name, :image_url

      attribute :constituency_name do |user|
        user.constituency&.name
      end
    end
  end
end
