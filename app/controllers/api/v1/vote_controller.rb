module Api
  module V1
    # "I've voted" — ports User::VoteController#create.
    #
    # There is deliberately no #show. Everything the React screen reads
    # already exists: `hasVoted` and the willing party ride on the session
    # payload, and the partner's name comes from GET /api/v1/swap, which
    # discloses it only on a confirmed swap — exactly this endpoint's gate.
    #
    # No phase gate, matching the legacy controller: it has only
    # `require_login` and `require_swap`, and in particular is not gated on
    # `voting_open?`.
    class VoteController < BaseController
      include SessionPayload

      before_action :require_logged_in!
      before_action :require_confirmed_swap!

      def create
        # Idempotent. The legacy controller sets and mails unconditionally,
        # every call; in HAML the button disappears once voted, so a second
        # send was hard to trigger, but a JSON endpoint is a double-click
        # away from one. It never intended a second email — nothing guarded
        # against it.
        return render_session_payload if current_user.has_voted

        current_user.update!(has_voted: true)
        UserMailer.partner_has_voted(current_user.swapped_with).deliver_now

        render_session_payload
      end
    end
  end
end
