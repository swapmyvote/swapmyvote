class Poll < ApplicationRecord
  belongs_to :constituency,
             class_name: "OnsConstituency",
             foreign_key: "constituency_ons_id",
             primary_key: "ons_id",
             inverse_of: "polls",
             optional: true
  belongs_to :party

  class << self
    # For each combination of party and constituency we figure out how close that party is to tipping the balance
    # in that constituency.
    #
    # Method: Take the party of interest, and find their predicted vote share in that constituency.
    # Then take the rest of the parties in that constituency and find the maximum vote share amongst them.
    # Then find the difference and save it as an absolute value. Call it marginal score.
    #
    # Now we can offer voters an attractive constituency to swap with, by preferring constituencies where their
    # preferred party has a low marginal score ... meaning the party either needs a bit of help getting over
    # the line, or it needs its expected majority bolstering to safe levels. Now when we offer
    # potential swaps, 50% of those will be random, and 50% will be from marginals as defined above.
    #
    # Big marginal score implies the preferred party is either way out in front and a safe seat, or way behind
    # without a chance
    #
    def calculate_marginal_score(progress: false)
      # rubocop:disable Rails/FindEach
      OnsConstituency.all.each do |constituency|
      # rubocop:enable Rails/FindEach
        polls = constituency.polls

        polls.each do |poll|
          party_votes = poll.votes
          max_votes = polls.select { |p| p.id != poll.id }.map(&:votes).max
          poll.update(marginal_score: (max_votes - party_votes).abs)
          print "." if progress
        end
      end
      puts if progress
    end
  end
end
