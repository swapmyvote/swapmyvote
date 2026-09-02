module Api
  module V1
    # Ported from MobilePhoneController, which still serves the legacy HAML
    # pages and is unchanged.
    class MobilePhoneVerificationsController < BaseController
      include SessionPayload

      # Shape only. Whether it is a *mobile* stays a client-side check: that
      # needs libphonenumber metadata we do not load server-side.
      E164 = /\A\+[1-9]\d{6,14}\z/.freeze

      SMS_TEMPLATE = "Your verification code is %token. " \
                     "Please enter this code as prompted on the " \
                     "SwapMyVote website.".freeze

      before_action :require_logged_in!
      before_action :require_swapping_open!

      # Every unique index this controller can collide with is
      # mobile_phones.number, so a lost race reports exactly what the
      # pre-send number_taken? check reports. BaseController's generic
      # handler cannot name the field; here we can, and the client should not
      # see two different shapes for the same collision depending on timing.
      rescue_from ActiveRecord::RecordNotUnique, with: :render_validation_failed

      def create
        number = params[:number].presence

        return render_already_verified if pointless_reverification?(number)
        # Not phone.nil?: the legacy controller nils the number of an
        # existing row on a failed send, and both flows share one row. That
        # state has to read as "no number" here too.
        return render_number_missing if number.nil? && phone&.number.blank?
        return render_invalid_number if number && !number.match?(E164)

        target_number = number || phone.number
        return render_validation_failed if number_taken?(target_number)

        send_verification(number, target_number)
      end

      def confirm
        return render_already_verified if phone&.verified
        return render_no_verification_pending if phone&.verify_id.blank?
        return unless check_token

        phone.update!(verified: true, verify_id: nil)

        # Not render_session_payload: that also returns a CSRF token header,
        # which only matters where the logged-in user changes.
        render json: session_payload
      end

      private

      # A verified user sending a *different* number is allowed, not refused:
      # it is the only way a number gets replaced now that the React profile
      # screen has no number field.
      def pointless_reverification?(number)
        return false unless phone&.verified

        number.nil? || number == phone.number
      end

      # Explicit rather than left to MobilePhone's uniqueness validation, so
      # the collision is found before we text a code to the number.
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
        # request_otp has already rendered on its rescue path. Without this,
        # the otp.nil? check below renders a second time and every MessageBird
        # exception becomes a DoubleRenderError.
        return if performed?
        # verify_create can also come back nil without raising, which the
        # legacy controller guarded too.
        return render_sms_send_failed if otp.nil?

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
        render_sms_send_failed
        nil
      end

      def render_sms_send_failed
        render_error(
          code: "sms_send_failed",
          status: :bad_gateway,
          messages: ["Sorry, I couldn't send you a verification SMS! " \
                     "Please try again later."]
        )
      end

      # Takes the id explicitly, captured before send_verification reassigns
      # the number: a changed number destroys and recreates the MobilePhone
      # row, so reading verify_id off it afterwards reads nil.
      def delete_previous_verify_id(verify_id)
        SwapMyVote::MessageBird.verify_delete(verify_id)
      rescue MessageBird::ErrorException => ex
        return if verify_object_missing?(ex)

        notify_error_exception(ex, "verify_delete(#{verify_id}) failed")
      end

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
          messages: ["This doesn't look like a phone number"]
        )
      end

      # Must stay identical to what MobilePhone's uniqueness validation
      # produces through BaseController's RecordInvalid rescue_from: the same
      # collision reaches callers by both routes.
      def render_validation_failed
        render_error(
          code: "validation_failed",
          status: :unprocessable_entity,
          messages: ["Number has already been taken"],
          fields: { number: ["has already been taken"] }
        )
      end

      def render_no_verification_pending
        render_error(
          code: "no_verification_pending",
          status: :conflict,
          messages: ["We haven't sent you a code yet. Please request one."]
        )
      end

      # Order matters: "already been processed" must be matched before the
      # looser /expired/ and /token is invalid/, as the legacy `case` did.
      FAILURE_REASONS = [
        [/token has already been processed/, "code_already_used",
         "This code has already been used."],
        [/expired/, "code_expired", "The code expired."],
        [/token is invalid/, "code_incorrect",
         "The code you entered was incorrect."]
      ].freeze

      def check_token
        SwapMyVote::MessageBird.verify_token(phone.verify_id, params[:token].to_s)
        true
      rescue MessageBird::ErrorException => ex
        render_verify_failure(ex)
        false
      end

      def render_verify_failure(ex)
        code, message = failure_reason(ex)

        if code.nil?
          notify_error_exception(ex, "Verifying number #{phone.number} failed")
          return render_error(
            code: "verification_failed",
            status: :bad_gateway,
            messages: ["Something went wrong when verifying your number"]
          )
        end

        render_error(
          code: code,
          status: :unprocessable_entity,
          messages: ["#{message} Please use the code sent most recently."]
        )
      end

      def failure_reason(ex)
        ex.errors.each do |error|
          next unless error.code == 10

          FAILURE_REASONS.each do |pattern, code, message|
            return [code, message] if error.description =~ pattern
          end
        end

        [nil, nil]
      end

      # Duplicated from MobilePhoneController, which is frozen until M9
      # cleanup because it still serves a live HAML page.
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
