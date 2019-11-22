class MobilePhoneController < ApplicationController
  before_action :require_login

  def verify_create
    return if mobile_verified?

    otp, errors = SwapMyVote::MessageBird.verify_create(number, verify_template)

    if errors
      error = "Failed to send verification code to #{number}: " +
              errors.join("\n")
      logger.error error
      flash.alert = error
      redirect_back fallback_location: edit_user_path
      return
    end

    if phone.verify_id
      logger.debug "Deleting previous verify id #{phone.verify_id}"
      errors = SwapMyVote::MessageBird.verify_delete(phone.verify_id)
      if errors
        logger.error("verify_delete(#{phone.verify_id}) failed: " +
                     errors.join("\n"))
      end
    end

    phone.verify_id = otp.id
    logger.debug "Created verification for user #{current_user.id} / " \
                 "/ phone #{phone.id} (#{phone.number}); " \
                 "verify_id: #{otp.id}"
    phone.save!
  end

  private

  def verify_template
    "Your verification code is %token."
  end

  def phone
    current_user.mobile_phone
  end

  def number
    current_user.mobile_number
  end
end
