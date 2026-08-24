module Api
  module V1
    # The `GET /api/v1/session` body, shared by every endpoint that can change
    # who we are logged in as. Login, registration and log out all answer with
    # it so the SPA can prime its session cache from the response instead of
    # racing a refetch.
    module SessionPayload
      extend ActiveSupport::Concern

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
