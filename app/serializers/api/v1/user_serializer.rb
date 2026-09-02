module Api
  module V1
    # The logged-in user, as the SPA needs them. Only ever serialized for the
    # user themselves (inside the session payload), so their own email is
    # included; a swap partner is serialized by SwapSerializer instead, which
    # discloses far less.
    #
    # The derived booleans mirror the legacy ApplicationHelper predicates the
    # HAML views branch on, so the React chrome can make the same decisions
    # without re-deriving them from raw associations.
    class UserSerializer
      include Alba::Resource

      transform_keys :lower_camel

      attributes :id, :name, :email, :image_url

      attribute :has_constituency do |user|
        user.constituency.present?
      end

      attribute :constituency_name do |user|
        user.constituency&.name
      end

      attribute :constituency_ons_id do |user|
        user.constituency&.ons_id
      end

      attribute :mobile_verified do |user|
        user.mobile_phone_verified? || false
      end

      attribute :mobile_set_but_not_verified do |user|
        user.mobile_phone.present? && !user.mobile_phone.verified
      end

      # So the React verification form can start from the number on file
      # rather than making the user retype it.
      attribute :mobile_number do |user|
        user.mobile_number
      end

      one :preferred_party, resource: PartySerializer
      one :willing_party, resource: PartySerializer
    end
  end
end
