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

    # Dev and E2E have no MessageBird key, so with this set the SMS is
    # skipped and one fixed code is accepted.
    #
    # This guard is deliberately a default-deny allowlist rather than a
    # `Rails.env.production?` blacklist. This flag disables the whole
    # anti-fake-account control (with it set, "123456" verifies any number on
    # any account), so it must fail closed for every environment it doesn't
    # explicitly recognise — not just production. doc/admin-guide.md records
    # a standing operational wish to bypass SMS verification on staging, so a
    # config/environments/staging.rb is a plausible next environment, and a
    # blacklist would silently accept the flag there.
    def fake_otp
      token = ENV["MESSAGEBIRD_FAKE_OTP"]
      return nil if token.blank?

      unless Rails.env.development? || Rails.env.test?
        raise "MESSAGEBIRD_FAKE_OTP is set outside development/test: " \
              "refusing to accept a fixed verification code"
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
