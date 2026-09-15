module Api
  module V1
    # Password reset, ported from Devise::PasswordsController.
    #
    # The Devise mailer is deliberately untouched: it keeps linking to
    # /users/password/edit, which keeps serving Devise HAML until cutover. So
    # reset links already in people's inboxes keep working throughout the
    # migration, and at M11 that same URL starts landing on the React screen.
    class PasswordsController < BaseController
      include SessionPayload

      before_action :reject_when_logged_in!

      # Always 202, registered or not.
      #
      # config.paranoid is off, so the HAML page answers an unknown address
      # with "Email not found" — it will tell anyone who asks whether a given
      # person has an account. That is a much cheaper oracle to script against
      # as JSON than as a form, so this endpoint refuses to be one. The cost is
      # real and accepted: someone who mistypes their address gets no feedback
      # and simply never receives the mail.
      def create
        User.send_reset_password_instructions(email: params[:email])
        render json: { status: "accepted" }, status: :accepted
      end

      # config.sign_in_after_reset_password is left at its default of true, so
      # a successful reset logs the user straight in and this answers with the
      # session payload — the same shape POST /api/v1/session returns, so the
      # SPA primes its cache by the path it already uses after login.
      def update
        user = User.reset_password_by_token(
          reset_password_token: params[:token],
          password: params[:password],
          password_confirmation: params[:password_confirmation]
        )

        return render_invalid_token if user.errors[:reset_password_token].present?
        return render_reset_errors(user) if user.errors.any?

        sign_in(user)
        render_session_payload
      end

      private

      # reset_password_by_token puts an error on :reset_password_token when the
      # token is unknown or spent (an unpersisted record, added by Devise's
      # find_or_initialize_with_error_by) or older than
      # config.reset_password_within (a persisted record, once
      # reset_password_period_valid? fails). Either way that is a different
      # kind of failure from a weak password, and the screen says something
      # different about it, so it gets its own code — checked by the error key,
      # not by persistence, since the two cases disagree on that.
      def render_invalid_token
        render_error(
          code: "invalid_token",
          status: :unprocessable_entity,
          messages: ["That password reset link is invalid or has expired. " \
                     "Please request a new one."]
        )
      end

      def render_reset_errors(user)
        render_error(
          code: "validation_failed",
          status: :unprocessable_entity,
          messages: user.errors.full_messages,
          fields: user.errors.to_hash(true)
        )
      end
    end
  end
end
