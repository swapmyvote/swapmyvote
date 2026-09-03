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
      include SessionPayload

      before_action :require_logged_in!
      before_action :require_swapping_open!, only: [:show, :create]
      before_action :require_ready_to_swap!, only: [:create]

      def show
        render_swap
      end

      # User#swap_with_user_id reports every refusal as a model error rather
      # than raising, so the branch below is how a refusal becomes a status
      # code. The consent failure is the only 422: the other three are all
      # "someone else got there first", which is a conflict.
      def create
        current_user.swap_with_user_id(params[:user_id], consent?)

        return render_swap(status: :created, extra: { session: session_payload }) if
          current_user.errors.empty?

        messages = current_user.errors.full_messages
        current_user.errors.clear

        # can_swap_with? runs before swap_consent_given?, so a consent refusal
        # is the *only* message when it happens. Comparing against the whole
        # list, rather than sniffing for a substring, keeps that ordering
        # explicit.
        return render_consent_required if messages == [consent_message]

        render_error(code: "swap_conflict", status: :conflict, messages: messages)
      end

      private

      # The legacy form sends an unchecked box as an absent parameter and a
      # checked one as "on"; the SPA sends a real boolean. Accept both.
      def consent?
        value = params[:consent_share_email]
        value == true || value == "true" || value == "on"
      end

      # Verbatim from User#swap_consent_given?, so both live sites say the
      # same thing.
      def consent_message
        "You and your vote swap partner need to be able to contact " \
          "each other by email so you can establish trust between you. " \
          "(See the FAQ)"
      end

      def render_consent_required
        render_error(code: "consent_required", status: :unprocessable_entity,
                     messages: [consent_message])
      end

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
