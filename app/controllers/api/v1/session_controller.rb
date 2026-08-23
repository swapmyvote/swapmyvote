module Api
  module V1
    # The SPA's bootstrap endpoint, and the one place it learns who it is
    # talking as and which operational phase the site is in.
    #
    #   GET    /api/v1/session  — the payload (works logged out: currentUser nil)
    #   DELETE /api/v1/session  — log out (CSRF-protected, login required)
    class SessionController < BaseController
      before_action :require_logged_in!, only: :destroy

      def show
        render json: session_payload
      end

      def destroy
        sign_out(current_user)
        # Answer with a fresh payload rather than 204 so the SPA can prime its
        # session cache from the response instead of racing a refetch.
        render json: session_payload
      end

      private

      def session_payload
        SessionSerializer.new(
          SessionPresenter.new(
            app_mode: app_mode,
            current_user: current_user,
            flags: {
              logins_open: logins_open?,
              swapping_open: swapping_open?,
              voting_open: voting_open?,
              # `swap_confirmed?` is nil (not false) for an unconfirmed swap,
              # and the flags are a boolean contract — coerce.
              voting_info_locked: voting_info_locked? || false
            }
          ),
          params: { viewer: current_user }
        ).to_h
      end
    end
  end
end
