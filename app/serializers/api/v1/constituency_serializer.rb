module Api
  module V1
    # A constituency the site runs swaps in. `onsId` is the ONS GSS code — the
    # same code postcodes.io returns as `parliamentary_constituency_2024`, and
    # the key the whole domain joins on.
    class ConstituencySerializer
      include Alba::Resource

      transform_keys :lower_camel

      attributes :ons_id, :name
    end
  end
end
