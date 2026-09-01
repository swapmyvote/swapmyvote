class SwapMyVote::MessageBird
  # Description MessageBird itself returns for a wrong code, matched by
  # Api::V1::MobilePhoneVerificationsController::FAILURE_REASONS.
  INVALID_TOKEN_DESCRIPTION = "The token is invalid.".freeze

  FAKE_VERIFY_ID = "fake-verify-id".freeze

  class << self
    def client
      @_client ||= MessageBird::Client.new(ENV["MESSAGEBIRD_API_KEY"])
    end

    def verify_create(mobile_number, template)
      return MessageBird::Verify.new("id" => FAKE_VERIFY_ID) if fake_otp

      otp = SwapMyVote::MessageBird.client.verify_create(
        mobile_number,
        originator: "SwapMyVote",
        timeout: 10 * 60,
        template: template
      )
      return otp
    end

    def verify_delete(verify_id)
      return if fake_otp

      SwapMyVote::MessageBird.client.verify_delete(verify_id)
    rescue NoMethodError => ex
      Rails.logger.warn "Bug in messagebird-rest gem:\n#{ex}\n" +
                        (ex.backtrace.join "\n")
    end

    def verify_token(verify_id, token)
      return fake_verify_token(token) if fake_otp

      SwapMyVote::MessageBird.client.verify_token(verify_id, token)
    end

    private

    # Dev and E2E have no MessageBird key, so an OTP journey cannot be driven
    # end to end against the real API. With this set, the SMS is skipped and
    # one fixed code is accepted — which is only ever safe away from real
    # users, hence the production refusal.
    def fake_otp
      token = ENV["MESSAGEBIRD_FAKE_OTP"]
      return nil if token.blank?

      if Rails.env.production?
        raise "MESSAGEBIRD_FAKE_OTP is set in production: refusing to accept " \
              "a fixed verification code"
      end

      token
    end

    def fake_verify_token(token)
      return true if token == fake_otp

      raise MessageBird::ErrorException,
            [MessageBird::Error.new("code" => 10,
                                    "description" => INVALID_TOKEN_DESCRIPTION)]
    end
  end
end
