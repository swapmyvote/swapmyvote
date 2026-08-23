module Api
  module V1
    # See PrePopulatePresenter. Echoes back what was stored, so the SPA can
    # confirm what the server actually accepted rather than assuming.
    class PrePopulateSerializer
      include Alba::Resource

      transform_keys :lower_camel

      attributes :constituency_ons_id, :preferred_party_name,
                 :willing_party_name
    end
  end
end
