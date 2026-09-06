module Api
  module V1
    # The two calculations behind every poll chart we serve: which polls a
    # chart draws, and how far ahead or behind each party is.
    #
    # Extracted from ConstituenciesController so the swap candidate
    # serializers get the same numbers from the same code — five candidates
    # each carry their own constituency's chart.
    module PollChartData
      extend ActiveSupport::Concern

      private

      # Matches PollsHelper#poll_data_for: parties with no predicted votes are
      # left off the chart entirely, and the rest run biggest first.
      def chart_polls(all_polls)
        all_polls.reject { |poll| poll.votes.to_i.zero? }
                 .sort_by { |poll| -poll.votes }
      end

      # Same maths as Poll#signed_marginal_score, but computed here from polls
      # we already loaded, rather than each poll re-querying its constituency
      # and siblings.
      #
      # Comparing against `all_polls` — not the zero-vote-filtered `polls` —
      # matches the model method: a poll's margin is against every other party
      # standing, not just the ones the chart draws.
      #
      # `others.max` can be nil (a constituency with a single poll, or every
      # sibling having no recorded votes yet), and any sibling's `votes` can be
      # nil (the column has no default) — both would blow up the model's
      # `votes - other_poll_votes.max`, so a missing comparison is treated as
      # "nothing to be ahead or behind of", i.e. 0.
      def signed_marginal_scores(polls, all_polls)
        polls.each_with_object({}) do |poll, scores|
          others = all_polls.reject { |other| other.id == poll.id }.filter_map(&:votes)
          scores[poll.id] = poll.votes - (others.max || 0)
        end
      end
    end
  end
end
