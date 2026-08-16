module Api
  module V1
    # A party as the SPA needs it: enough to name it and colour it.
    # `smvCode` is what utils/party.ts maps to the `.party-*` colour classes.
    class PartySerializer
      include Alba::Resource

      transform_keys :lower_camel

      attributes :id, :name, :color, :smv_code
    end
  end
end
