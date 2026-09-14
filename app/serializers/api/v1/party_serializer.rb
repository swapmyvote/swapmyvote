module Api
  module V1
    # A party as the SPA needs it: enough to name it and colour it.
    # `smvCode` is what utils/party.ts maps to the `.party-*` colour classes.
    class PartySerializer
      include Alba::Resource

      transform_keys :lower_camel

      attributes :id, :name, :color, :smv_code

      # The spelling a partner site passes to /swap?willing_party_name=, which
      # the API docs page documents. Derived here rather than in TypeScript
      # because Api::V1::RegistrationController#party_id_for matches inbound
      # values through the same helper — two definitions of this string would
      # silently break deep links the moment either changed.
      attribute :canonical_name do |party|
        ApplicationController.helpers.canonical_name(party.name)
      end
    end
  end
end
