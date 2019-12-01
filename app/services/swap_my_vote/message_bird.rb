class SwapMyVote::MessageBird
  class << self
    def client
      @_client ||= MessageBird::Client.new(ENV["MESSAGEBIRD_API_KEY"])
    end

    def verify_create(mobile_number, template)
      otp = SwapMyVote::MessageBird.client.verify_create(
        mobile_number,
        originator: "SwapMyVote",
        timeout: 10 * 60,
        template: template
      )
      return otp
    end

    def verify_delete(verify_id)
      SwapMyVote::MessageBird.client.verify_delete(verify_id)
    rescue NoMethodError => ex
      Rails.logger.warn "Bug in messagebird-rest gem:\n#{ex}\n" +
                        (ex.backtrace.join "\n")
    end

    def verify_token(verify_id, token)
      SwapMyVote::MessageBird.client.verify_token(verify_id, token)
    end
  end
end
