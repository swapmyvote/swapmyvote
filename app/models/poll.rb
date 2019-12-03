class Poll < ApplicationRecord
  belongs_to :constituency,
             class_name: "OnsConstituency",
             foreign_key: "constituency_ons_id",
             primary_key: "ons_id",
             inverse_of: "polls",
             optional: true
  belongs_to :party

  class << self
    def calculate_marginal_score
      OnsConstituency.all.each do |constituency|
        polls = constituency.polls

        polls.each do |poll|
          party_votes = poll.votes
          max_votes = polls.select { |p| p.id != poll.id }.map{ |p| p.votes }.max
          poll.update(marginal_score: (max_votes - party_votes).abs)
        end
      end
    end
  end
end
