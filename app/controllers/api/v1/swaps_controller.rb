module Api
  module V1
    # Ported from User::SwapsController, which still serves the legacy HAML
    # pages and is unchanged.
    #
    # The guard set is not uniform across actions, and the asymmetry is
    # deliberate in the original: swapping being closed does not stop someone
    # confirming, sharing an email or rejecting a swap they already have, and
    # only the *chosen* side can reject.
    class SwapsController < BaseController
      include SwapCandidateData

      before_action :require_logged_in!
      before_action :require_swapping_open!, only: [:show]

      def show
        render_swap
      end

      private

      # One body shape for the read and, from Task 5 on, for every mutation.
      def render_swap(status: :ok, extra: {})
        # User#clear_swap (a before_save callback) reads incoming_swap /
        # outgoing_swap on every create, including this user's own, which
        # caches both as loaded-but-empty before either association could
        # possibly hold anything. That empty cache survives on the in-memory
        # object indefinitely — reload clears it so #swap and #swapped_with
        # below see whatever the database actually holds right now, not
        # whatever was true at signup.
        current_user.reload
        swap = current_user.swap

        render json: { swap: swap_json(swap) }.merge(extra), status: status
      end

      def swap_json(swap)
        return nil if swap.nil?

        # User#swapped_with already resolves the far side from whichever
        # association this user holds, without going through Swap#choosing_user.
        partner = current_user.swapped_with

        SwapDetailSerializer.new(
          swap,
          params: candidate_params([partner]).merge(
            viewer: current_user,
            swap_confirmed: swap.confirmed || false
          )
        ).to_h
      end
    end
  end
end
