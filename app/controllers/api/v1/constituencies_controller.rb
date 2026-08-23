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

        render json: ConstituencyDetailSerializer.new(
          constituency,
          params: { polls: chart_polls(constituency) }
        ).to_h
      end

      private

      # Matches PollsHelper#poll_data_for: parties with no predicted votes are
      # left off the chart entirely, and the rest run biggest first.
      def chart_polls(constituency)
        constituency.polls.reject { |poll| poll.votes.to_i.zero? }
                    .sort_by { |poll| -poll.votes }
      end
    end
  end
end
