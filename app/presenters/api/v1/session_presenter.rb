module Api
  module V1
    # Everything `GET /api/v1/session` exposes, gathered into one object so it
    # can be serialized like any other resource.
    #
    # This is the SPA's single source of truth for auth, operational phase and
    # swap state: it is re-fetched after every mutation and on a poll, so the
    # client sees out-of-band changes (a partner confirming or cancelling a
    # swap, Swap.cancel_old expiring one, an ?opensesame= phase override).
    #
    # The flags are computed by the controller from AppModeConcern rather than
    # here, so the server stays the single place the phase rules live.
    class SessionPresenter
      FLAGS = [:logins_open, :swapping_open, :voting_open,
               :voting_info_locked].freeze

      attr_reader :app_mode, :current_user

      def initialize(app_mode:, current_user:, flags:)
        @app_mode = app_mode
        @current_user = current_user
        @flags = flags
      end

      FLAGS.each do |flag|
        define_method(flag) { @flags.fetch(flag) }
      end

      def swap
        current_user&.swap
      end
    end
  end
end
