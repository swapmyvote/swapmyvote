module Api
  module V1
    # Password reset, ported from Devise::PasswordsController.
    #
    # The Devise mailer is deliberately untouched: it keeps linking to
    # /users/password/edit, which keeps serving Devise HAML until cutover. So
    # reset links already in people's inboxes keep working throughout the
    # migration, and at M11 that same URL starts landing on the React screen.
    class PasswordsController < BaseController
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
    end
  end
end
