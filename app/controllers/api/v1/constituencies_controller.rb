module Api
  module V1
    # The constituencies the site is currently running swaps in — two for a
    # by-election, the full list for a general election. Reference data, same
    # as parties: no auth, no phase gate.
    class ConstituenciesController < BaseController
      def index
        render json: ConstituencySerializer.new(
          OnsConstituency.all.order(:name)
        ).to_h
      end
    end
  end
end
