module Api
  module V1
    # The find-a-swap list, ported from the match-generation half of
    # User::SwapsController#show.
    #
    # `#index` is a GET that mutates: User#potential_swap_users expires stale
    # PotentialSwap rows and generates replacements, exactly as the legacy page
    # does on every visit. The SPA therefore opts out of background refetching
    # for this query — see app/frontend/lib/swap.ts.
    class PotentialSwapsController < BaseController
      include SwapCandidateData
      include UsersHelper

      before_action :require_logged_in!
      before_action :require_swapping_open!
      before_action :require_swap_profile_complete!
      before_action :reject_when_already_swapped!

      # Same count the legacy screen asks for.
      CANDIDATE_COUNT = 5

      def index
        candidates = current_user.potential_swap_users(CANDIDATE_COUNT)

        render json: {
          potentialSwaps: SwapCandidateSerializer.new(
            candidates, params: candidate_params(candidates)
          ).to_h,
          expiryMinutes: potential_swap_expiry_mins
        }
      end
    end
  end
end
