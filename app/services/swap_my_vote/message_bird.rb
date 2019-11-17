class SwapMyVote::MessageBird
  def self.client
    @_client ||= MessageBird::Client.new(ENV["MESSAGEBIRD_API_KEY"])
  end
end
