class MobilePhoneController < ApplicationController
  before_action :require_login
  before_action :require_swapping_open

  def verify_create
    return if mobile_verified?

    phone.number = params[:mobile_phone][:full] if params[:mobile_phone]

    otp = api_get_otp
    if otp.nil?
      rescue_error("Sorry, I couldn't send you a verification SMS! Please try again later.")
      return
    end

    delete_previous_verify_id if phone.verify_id
    phone.verify_id = otp.id
    logger.debug "Created verification for user #{current_user.id} / " \
                 "phone #{phone.id} (#{phone.number}); " \
                 "verify_id: #{otp.id}"

    phone.save!
  rescue ActiveRecord::RecordInvalid
    # We can get here if a the number is already in the DB. This can happen
    # legitimately if a user has two accounts (eg twitter + email) and verifies
    # the same number for both: to be improved when we enable multiple profiles
    rescue_error(phone.errors.full_messages)
  end

  def verify_token
    @new_verification = false
    return if mobile_verified?

    unless api_verify_token
      # Something went wrong
      redirect_back fallback_location: edit_user_path
      return
    end

    @new_verification = true
    phone.verified = true
    phone.verify_id = nil

    # Number will be saved even though we are still waiting for verification
    phone.save!
  end

  private

  def rescue_error(message_text)
    # Make sure the number is removed if we could not send verification
    # or if it is a duplicate
    phone.update(number: nil)
    flash[:errors] = [message_text]
    redirect_back fallback_location: edit_user_path
    return
  end

  def sms_template
    "Your verification code is %token. " +
      "Please enter this code as prompted on the SwapMyVote website."
  end

  def api_get_otp
    return SwapMyVote::MessageBird.verify_create(phone.number, sms_template)
  rescue MessageBird::ErrorException => ex
    msg = "Failed to send verification code to #{phone.number}"
    flash_error msg
    notify_error_exception(ex, msg)
    return nil
  end

  def delete_previous_verify_id
    logger.debug "Deleting previous verify id #{phone.verify_id}"

    begin
      SwapMyVote::MessageBird.verify_delete(phone.verify_id)
    rescue MessageBird::ErrorException => ex
      if ex.errors.length == 1
        error = ex.errors.first
        return if error.code == 20 &&
                  error.description =~ /Verify object could not be found/
      end
      notify_error_exception(ex, "verify_delete(#{phone.verify_id}) failed")
    end
  end

  def api_verify_token
    SwapMyVote::MessageBird.verify_token(phone.verify_id, params[:token])
    return true
  rescue MessageBird::ErrorException => ex
    reason = verify_failure_reason(ex)
    if reason == :unknown
      notify_error_exception(ex, "Verifying number #{phone.number} failed")
      reason = "Something went wrong when verifying number #{phone.number}."
    else
      reason += " Please use the code sent most recently."
    end

    flash_error reason
    return false
  end

  def verify_failure_reason(ex)
    ex.errors.each do |error|
      next unless error.code == 10

      case error.description
      when /token has already been processed/
        return "This code has already been used."
      when /expired/
        return "The code expired."
      when /token is invalid/
        return "The code you entered was incorrect."
      end
    end

    return :unknown
  end

  def notify_error_exception(ex, action)
    ex.errors.each do |error|
      notify_error error
    end
    msg = action + ":\n" + error_messages_from_exception(ex).join("\n")
    logger.error(msg)
  end

  def notify_error(error)
    Airbrake.notify(
      error_message(error), {
        code: error.code,
        description: error.description,
        parameter: error.parameter,
      }
    )
  end

  def handle_errors(errors, msg)
    error = msg + ": " + errors.join("\n")
    logger.error error
    redirect_back fallback_location: edit_user_path
  end

  def flash_error(msg)
    flash[:messagebird_error] = msg
  end

  def error_messages_from_exception(ex)
    ex.errors.map { |error| error_message(error) }
  end

  def error_message(error)
    "Error code #{error.code}: #{error.description}"
    # user_friendly_error_message(ex, error)
  end

  def user_friendly_error_message(ex, error)
    if error.code == 10
      case error.description
      when /expired/
        return "Sorry, the code has expired."
      when /invalid/
        return "Sorry, the code does not match correctly."
      end
    end

    # Anything else is unexpected, so log it but don't expose the details
    # to the user.
    logger.error "#{ex} error code #{error.code}: #{error.description}"
    airbrake
    return "Something went wrong."
  end

  def phone
    current_user.mobile_phone
  end
end
