module Api
  module V1
    # The constituencies the site is currently running swaps in — two for a
    # by-election, the full list for a general election. Reference data, same
    # as parties: no auth, no phase gate.
    class ConstituenciesController < BaseController
      def index
        render json: ConstituencySerializer.new(
          OnsConstituency.all.order(:name)
        ).to_h
      end

      # The chart on the review screen: one constituency, with the polls it
      # draws. Public, like #index — the same numbers are already on the
      # legacy swap pages.
      def show
        constituency = OnsConstituency.find_by!(ons_id: params[:ons_id])
        all_polls = constituency.polls.includes(:party).to_a
        polls = chart_polls(all_polls)

        render json: ConstituencyDetailSerializer.new(
          constituency,
          params: {
            polls: polls,
            signed_marginal_scores: signed_marginal_scores(polls, all_polls)
          }
        ).to_h
      end

      private

      # Matches PollsHelper#poll_data_for: parties with no predicted votes are
      # left off the chart entirely, and the rest run biggest first.
      def chart_polls(all_polls)
        all_polls.reject { |poll| poll.votes.to_i.zero? }
                 .sort_by { |poll| -poll.votes }
      end

      # Same maths as Poll#signed_marginal_score, but computed here from the
      # constituency's polls we already loaded, rather than each poll
      # re-querying its constituency and siblings (no `inverse_of` on
      # OnsConstituency#polls means that association isn't primed either
      # way). Comparing against `all_polls` — not the zero-vote-filtered
      # `polls` — matches the model method: a poll's margin is against every
      # other party standing, not just the ones the chart draws.
      #
      # `others.max` can be nil (a constituency with a single poll, or every
      # sibling having no recorded votes yet), and any sibling's `votes` can
      # be nil (the column has no default) — both would blow up the model's
      # `votes - other_poll_votes.max`, so we treat a missing comparison as
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
