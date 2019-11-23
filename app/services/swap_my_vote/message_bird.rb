class SwapMyVote::MessageBird
  class << self
    def client
      @_client ||= MessageBird::Client.new(ENV["MESSAGEBIRD_API_KEY"])
    end

    def verify_create(mobile_number, template)
      begin
        otp = SwapMyVote::MessageBird.client.verify_create(
          mobile_number,
          originator: "SwapMyVote",
          timeout: 10 * 60,
          template: template
        )

      # Is it better to expose MessageBird errors directly to
      # the user?
      #
      # rescue MessageBird::ErrorException => ex
      #   return nil, errors_from_exception(ex)
      end

      return otp, nil
    end

    def verify_delete(verify_id)
      begin
        SwapMyVote::MessageBird.client.verify_delete(verify_id)
      rescue MessageBird::ErrorException => ex
        return errors_from_exception(ex)
      rescue StandardError => ex
        return [ex.inspect + "\n" + ex.backtrace.join("\n")]
      end

      return nil
    end

    def verify_token(verify_id, token)
      begin
        SwapMyVote::MessageBird.client.verify_token(verify_id, token)
      rescue MessageBird::ErrorException => ex
        return errors_from_exception(ex)
      end

      return nil
    end

    private

    def errors_from_exception(ex)
      ex.errors.map do |error|
        "Error code #{error.code}: #{error.description}"
      end
    end
  end
end
