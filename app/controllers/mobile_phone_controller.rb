class MobilePhoneController < ApplicationController
  before_action :require_login

  def verify_create
    return if mobile_verified?

    otp, errors = SwapMyVote::MessageBird.verify_create(number, verify_template)

    if errors
      handle_errors(errors, "Failed to send verification code to #{number}")
      return
    end

    delete_previous_verify_id if phone.verify_id

    phone.verify_id = otp.id
    logger.debug "Created verification for user #{current_user.id} / " \
                 "/ phone #{phone.id} (#{phone.number}); " \
                 "verify_id: #{otp.id}"
    phone.save!
  end

  def verify_token
    @new_verification = false
    return if mobile_verified?

    errors = SwapMyVote::MessageBird.verify_token(phone.verify_id,
                                                  params[:token])

    if errors
      handle_errors(errors, "Failed to verify code to #{number}")
      return
    end

    @new_verification = true
    phone.verified = true
    phone.verify_id = nil
    phone.save!
  end

  private

  def verify_template
    "Your verification code is %token. Please enter this code at " +
      verify_token_url(log_in_with: current_user.provider)
  end

  def delete_previous_verify_id
    logger.debug "Deleting previous verify id #{phone.verify_id}"
    errors = SwapMyVote::MessageBird.verify_delete(phone.verify_id)
    return unless errors
    logger.error("verify_delete(#{phone.verify_id}) failed: " +
                 errors.join("\n"))
  end

  def handle_errors(errors, msg)
    error = msg + ": " + errors.join("\n")
    logger.error error
    flash[:errors] = [error]
    redirect_back fallback_location: edit_user_path
  end

  def phone
    current_user.mobile_phone
  end

  def number
    current_user.mobile_number
  end
end
