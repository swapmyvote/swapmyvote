module Api
  module V1
    # The constituencies the site is currently running swaps in — two for a
    # by-election, the full list for a general election. Reference data, same
    # as parties: no auth, no phase gate.
    class ConstituenciesController < BaseController
      include PollChartData

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
    end
  end
end
