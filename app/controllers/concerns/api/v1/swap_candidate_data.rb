module Api
  module V1
    # Gathers what SwapCandidateSerializer cannot read off a user on its own:
    # each candidate's chart polls, their signed margins, and the tactical-vote
    # recommendations for their constituency.
    #
    # Done in one pass over the candidates and handed down through Alba
    # `params`, so five candidates cost one traversal rather than five
    # serializer callbacks each re-querying.
    module SwapCandidateData
      extend ActiveSupport::Concern

      include PollChartData
      include RecommendationsHelper

      private

      # rubocop:disable Metrics/MethodLength
      def candidate_params(users)
        polls_by_user = {}
        recommendations_by_user = {}
        signed = {}

        users.each do |user|
          constituency = user.constituency
          next if constituency.nil?

          all_polls = constituency.polls.includes(:party).to_a
          polls = chart_polls(all_polls)

          polls_by_user[user.id] = polls
          signed.merge!(signed_marginal_scores(polls, all_polls))
          recommendations_by_user[user.id] = recommendations_for_user(user, constituency)
        end

        {
          polls_by_user: polls_by_user,
          recommendations_by_user: recommendations_by_user,
          signed_marginal_scores: signed
        }
      end
      # rubocop:enable Metrics/MethodLength

      # _swap_profile only draws the recommendations block when the candidate
      # has a willing party to match sites against.
      def recommendations_for_user(user, constituency)
        return [] unless user.willing_party

        fullest_recommendations_for(constituency, user.willing_party)
      end
    end
  end
end
