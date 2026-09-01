module Api
  module V1
    # Mobile-number verification, ported from MobilePhoneController.
    #
    #   POST /api/v1/mobile_phone/verifications         — send an OTP by SMS
    #   POST /api/v1/mobile_phone/verifications/confirm — check the code
    #
    # The legacy controller's two before_actions (require_login,
    # require_swapping_open) are mirrored here as guards that report their
    # refusal instead of redirecting, and its flash-and-redirect_back failure
    # paths become the shared JSON error convention.
    class MobilePhoneVerificationsController < BaseController
      include SessionPayload

      # The legacy server trusts whatever intl-tel-input put in the hidden
      # field. A JSON endpoint is callable without the widget, so check the
      # shape at least. The "is it a mobile?" check stays client-side: it
      # needs libphonenumber metadata we do not load server-side.
      E164 = /\A\+[1-9]\d{6,14}\z/.freeze

      SMS_TEMPLATE = "Your verification code is %token. " \
                     "Please enter this code as prompted on the " \
                     "SwapMyVote website.".freeze

      before_action :require_logged_in!
      before_action :require_swapping_open!

      def create
        number = params[:number].presence

        return render_already_verified if pointless_reverification?(number)
        return render_number_missing if number.nil? && phone.nil?
        return render_invalid_number if number && !number.match?(E164)

        target_number = number || phone.number
        return render_validation_failed if number_taken?(target_number)

        send_verification(number, target_number)
      end

      private

      # A verified user re-sending to the number they already verified has
      # nothing to gain. A *different* number is a real change, and is
      # allowed: it is how a number gets replaced now that the React profile
      # screen has no number field.
      def pointless_reverification?(number)
        return false unless phone&.verified

        number.nil? || number == phone.number
      end

      # Checked explicitly, and before the send, rather than left to
      # MobilePhone's uniqueness validation: texting a code to a number we
      # are about to refuse would be pointless, and nothing here may mutate
      # the record until MessageBird has accepted the send (see
      # send_verification).
      def number_taken?(target_number)
        MobilePhone.where(number: target_number)
                   .where.not(user_id: current_user.id)
                   .exists?
      end

      # Nothing is persisted until the send has succeeded. A transient
      # MessageBird failure must leave the account exactly as it was found —
      # in particular, it must not destroy an existing verified number to
      # make room for one that was never actually sent.
      def send_verification(number, target_number)
        previous_verify_id = phone&.verify_id

        otp = request_otp(target_number)
        return if performed?

        current_user.mobile_number = number if number && number != phone&.number
        delete_previous_verify_id(previous_verify_id) if previous_verify_id
        phone.update!(verify_id: otp.id)

        render json: { number: phone.number, sent: true }
      end

      def request_otp(target_number)
        SwapMyVote::MessageBird.verify_create(target_number, SMS_TEMPLATE)
      rescue MessageBird::ErrorException => ex
        notify_error_exception(
          ex, "Failed to send verification code to #{target_number}"
        )
        render_error(
          code: "sms_send_failed",
          status: :bad_gateway,
          messages: ["Sorry, I couldn't send you a verification SMS! " \
                     "Please try again later."]
        )
        nil
      end

      # Ported from MobilePhoneController#delete_previous_verify_id: a verify
      # object that has already gone is not a problem worth reporting. Takes
      # the id explicitly, captured before send_verification's reassignment,
      # because a changed number destroys and recreates the MobilePhone row
      # and the fresh row has no verify_id of its own yet.
      def delete_previous_verify_id(verify_id)
        SwapMyVote::MessageBird.verify_delete(verify_id)
      rescue MessageBird::ErrorException => ex
        return if verify_object_missing?(ex)

        notify_error_exception(ex, "verify_delete(#{verify_id}) failed")
      end

      # Duplicated from MobilePhoneController rather than extracted: that
      # controller is frozen until M9 cleanup because it still serves a live
      # HAML page. The duplication collapses then.
      def verify_object_missing?(ex)
        return false unless ex.errors.length == 1

        error = ex.errors.first
        error.code == 20 && error.description =~ /Verify object could not be found/
      end

      def render_already_verified
        render_error(
          code: "already_verified",
          status: :conflict,
          messages: ["Your mobile phone number has already been verified."]
        )
      end

      def render_number_missing
        render_error(
          code: "number_missing",
          status: :unprocessable_entity,
          messages: ["Please enter your mobile phone number before you swap"]
        )
      end

      def render_invalid_number
        render_error(
          code: "invalid_number",
          status: :unprocessable_entity,
          messages: ["That doesn't look like a phone number."]
        )
      end

      # Same code and message MobilePhone's `validates :number, uniqueness:
      # true` would have produced via BaseController's RecordInvalid
      # rescue_from — this path exists so the check runs before the send,
      # not because the failure means anything different.
      def render_validation_failed
        render_error(
          code: "validation_failed",
          status: :unprocessable_entity,
          messages: ["Number has already been taken"],
          fields: { number: ["has already been taken"] }
        )
      end

      # Ported verbatim from MobilePhoneController, minus the flash.
      # MobilePhoneController is frozen until M9 cleanup (it still serves a
      # live HAML page), so these three helpers cannot be extracted into a
      # shared module yet — the duplication collapses then.
      def notify_error_exception(ex, action)
        ex.errors.each { |error| notify_error(error) }
        msg = action + ":\n" + ex.errors.map { |e| error_message(e) }.join("\n")
        logger.error(msg)
      end

      def notify_error(error)
        Airbrake.notify(
          error_message(error), {
            code: error.code,
            description: error.description,
            parameter: error.parameter
          }
        )
      end

      def error_message(error)
        "Error code #{error.code}: #{error.description}"
      end

      def phone
        current_user.mobile_phone
      end
    end
  end
end
