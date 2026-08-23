module Api
  module V1
    # The logged-in user's own profile. Ports UsersController#update and
    # User::ConstituenciesController#update, which the React profile and
    # constituency screens both post to.
    #
    # Deliberately *not* gated on swapping being open: the legacy
    # UsersController gates only #show, so people can still fix their email
    # while swapping is closed.
    class UsersController < BaseController
      before_action :require_logged_in!
      before_action :reject_when_voting_info_locked!

      def update
        current_user.assign_attributes(user_params)

        # Read before saving, exactly where the legacy controller reads it:
        # ActiveModel's *_changed? predicates are only true pre-save.
        review_required = current_user.swap_profile_changed?

        errors = missing_field_errors
        return render_missing_fields(errors) if errors.any?

        return render_save_error unless current_user.save

        render json: {
          user: UserSerializer.new(current_user).to_h,
          reviewRequired: review_required
        }
      end

      private

      def render_save_error
        render_error(
          code: "validation_failed",
          status: :unprocessable_entity,
          messages: current_user.errors.full_messages,
          fields: current_user.errors.to_hash(true)
        )
      end

      def user_params
        params.permit(:preferred_party_id, :willing_party_id,
                      :constituency_ons_id, :email, :consent_news_email)
      end

      # Wording copied from the legacy controllers so the two live sites say
      # the same thing. Unlike them, nothing is saved when a field is missing:
      # the legacy screens persist the change and then flash the complaint.
      def missing_field_errors
        messages = []
        if current_user.preferred_party_id.blank?
          messages << "You must state which party you would prefer to vote for."
        end
        if current_user.willing_party_id.blank?
          messages << "You must state which party you are willing to vote for."
        end
        if current_user.constituency_ons_id.blank?
          messages << "You must tell us your constituency. Without it, the " \
                      "swaps we offer may not make sense."
        end
        messages
      end

      def render_missing_fields(messages)
        current_user.reload
        render_error(
          code: "validation_failed",
          status: :unprocessable_entity,
          messages: messages
        )
      end
    end
  end
end
