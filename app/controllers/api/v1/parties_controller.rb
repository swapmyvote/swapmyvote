module Api
  module V1
    # The parties a user can pick as their preferred or willing party.
    # Reference data: no auth, no phase gate, changes only when we seed it.
    class PartiesController < BaseController
      def index
        render json: PartySerializer.new(Party.all.order(:name)).to_h
      end
    end
  end
end
