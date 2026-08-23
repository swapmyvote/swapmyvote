module Api
  module V1
    # One party's predicted result in one constituency.
    #
    # Numbers go out raw: `votes` is the stored hundredths-of-a-percent value
    # the legacy PollsHelper divides by 100 for display, and the marginal
    # scores are in the same units. The frontend formats them, so a different
    # chart can be built from the same payload.
    class PollSerializer
      include Alba::Resource

      transform_keys :lower_camel

      attributes :votes, :marginal_score

      attribute :party_id do |poll|
        poll.party.id
      end

      attribute :party_name do |poll|
        poll.party.name
      end

      # The abbreviation the legacy chart labels bars with (PollsHelper).
      attribute :party_short_name do |poll|
        poll.party.short_name
      end

      attribute :color do |poll|
        poll.party.color
      end

      # Derived, not stored: how far ahead (+) or behind (-) this party is of
      # the best of the others. `marginal_score` is its absolute value, but
      # only once the rake task has run, so the sign has to come from here.
      attribute :signed_marginal_score do |poll|
        poll.signed_marginal_score
      end
    end
  end
end
