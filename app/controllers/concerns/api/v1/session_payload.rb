module Api
  module V1
    # The `GET /api/v1/session` body, shared by every endpoint that can change
    # who we are logged in as. Login, registration and log out all answer with
    # it, so the caller knows who it is now talking as without a second round
    # trip.
    module SessionPayload
      extend ActiveSupport::Concern

      CSRF_TOKEN_HEADER = "X-CSRF-Token".freeze

      private

      # Renders the payload for an endpoint that has just changed who we are
      # logged in as, and hands back the CSRF token that goes with the new
      # session. Devise's csrf_cleaner hook deletes session[:_csrf_token] on
      # authentication, and the bare, all-scopes `sign_out` in
      # SessionController#destroy reaches Warden::Proxy#logout with no scopes,
      # which calls reset_session! and throws the whole session away — so
      # either way, the token the SPA read from <meta name="csrf-token"> at
      # page load is stale from here on, and it has no other way to learn the
      # replacement short of a full page load.
      #
      # Returning it in a header is safe: the SPA is same-origin, and the token
      # is not a secret from a page that is already holding one. CSRF
      # protection rests on a cross-origin page being unable to read this
      # response at all, not on the token being unguessable to this page.
      def render_session_payload(status: :ok)
        response.set_header(CSRF_TOKEN_HEADER, form_authenticity_token)
        render json: session_payload, status: status
      end

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
