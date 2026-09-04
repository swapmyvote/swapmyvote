module Api
  module V1
    # Base class for the JSON API the React SPA consumes.
    #
    # The SPA is served same-origin (vite_rails), so the existing Devise
    # session cookie + Warden authenticate these endpoints with no new auth
    # code and `current_user` works as-is. CSRF stays `:exception` (inherited
    # from ApplicationController) — the SPA reads the token from
    # <meta name="csrf-token"> and sends X-CSRF-Token on every non-GET.
    #
    # Errors follow one convention:
    #   { "error": { "code": "...", "messages": [...], "fields": {...} } }
    class BaseController < ApplicationController
      rescue_from ActiveRecord::RecordNotFound, with: :render_not_found
      rescue_from ActiveRecord::RecordInvalid, with: :render_record_invalid
      # A model uniqueness validation loses a genuine race to a database
      # unique index, and the second write raises this instead of
      # RecordInvalid. Nothing persists either way; this is only about
      # answering with the error convention rather than a 500.
      rescue_from ActiveRecord::RecordNotUnique, with: :render_record_not_unique

      # ApplicationController answers a forged request with a flash +
      # redirect_back, which is meaningless to a fetch() caller. Answer with
      # the JSON error convention instead.
      def handle_unverified_request
        render_error(
          code: "invalid_authenticity_token",
          status: :unprocessable_entity,
          messages: ["Something went wrong - please try that again."]
        )
      end

      private

      # Guards mirror the legacy before_actions, but return status codes
      # instead of redirecting. Phase guards (require_swapping_open! etc.)
      # arrive with the milestones whose endpoints need them; every action
      # enforces its own gates — the client's copy of the flags is UX only.
      def require_logged_in!
        return if logged_in?

        render_error(
          code: "unauthenticated",
          status: :unauthorized,
          messages: ["You need to be logged in to do that."]
        )
      end

      # Mirrors ApplicationController#require_logins_open, which redirects to
      # the home page. During closed-warm-up the database is expected to be
      # empty and the site is not meant to look usable, so logging in and
      # signing up are refused here, not merely hidden in the UI.
      def require_logins_open!
        return if logins_open?

        render_error(
          code: "logins_closed",
          status: :forbidden,
          messages: ["Logins are closed at the moment"]
        )
      end

      # Mirrors ApplicationController#require_swapping_open, which redirects
      # to the home page.
      def require_swapping_open!
        return if swapping_open?

        render_error(
          code: "swapping_closed",
          status: :forbidden,
          messages: ["Swapping is closed at the moment"]
        )
      end

      # Mirrors User::SwapsController#assert_parties_exist, which redirects to
      # the profile edit screen. Both parties are what match generation keys
      # on, so without them there is nothing to search for.
      def require_swap_profile_complete!
        return if current_user.willing_party && current_user.preferred_party

        render_error(
          code: "profile_incomplete",
          status: :forbidden,
          messages: ["Please tell us which parties you prefer and are " \
                     "willing to vote for before you swap"]
        )
      end

      # Mirrors the `redirect_to user_path if @user.swapped?` at the top of
      # User::SwapsController#show. Generating matches for someone who already
      # has a partner would destroy the swap they have.
      def reject_when_already_swapped!
        return unless current_user.swapped?

        render_error(
          code: "already_swapped",
          status: :conflict,
          messages: ["You already have a swap"]
        )
      end

      # Mirrors assert_has_email / assert_has_constituency /
      # assert_mobile_phone_present / assert_mobile_phone_verified, which the
      # legacy controller runs on #new, #create and #update. Order matches, so
      # someone missing several fields is told about the same one first.
      #
      # mobile_verification_missing? rather than mobile_phone_verified?, so
      # TEST_USERS_SKIP_MOBILE_VERIFICATION keeps working for the E2E accounts.
      # rubocop:disable Metrics/MethodLength
      def require_ready_to_swap!
        if current_user.email.blank?
          return render_swap_prerequisite(
            "email_missing", "Please enter your email address before you swap"
          )
        end

        if current_user.constituency_ons_id.blank?
          return render_swap_prerequisite(
            "constituency_missing",
            "Please enter your postcode or constituency before you swap"
          )
        end

        if current_user.mobile_phone.blank?
          return render_swap_prerequisite(
            "mobile_missing",
            "Please enter your mobile phone number before you swap"
          )
        end

        return unless current_user.mobile_verification_missing?

        render_swap_prerequisite(
          "mobile_unverified",
          "Please verify your mobile phone number before you swap"
        )
      end
      # rubocop:enable Metrics/MethodLength

      def render_swap_prerequisite(code, message)
        render_error(code: code, status: :forbidden, messages: [message])
      end

      # Mirrors assert_swap_exists, which User::SwapsController runs on
      # #update, before the four assert_* readiness checks.
      def require_any_swap!
        return if current_user.swap

        render_error(code: "no_swap", status: :conflict,
                     messages: ["You don't have a swap!"])
      end

      # Mirrors assert_incoming_swap_exists, which runs on #destroy only.
      # Rejecting is the chosen user's move: the outgoing HAML view offers no
      # cancel control at all.
      def require_incoming_swap!
        return if current_user.incoming_swap

        render_error(code: "no_swap", status: :conflict,
                     messages: ["You don't have a swap!"])
      end

      # Mirrors the `require_no_authentication` Devise prepends to its own
      # SessionsController and RegistrationsController, which bounces an
      # already-signed-in visitor rather than letting them log in again or
      # create a second account. Without it a logged-in user could register a
      # second account, be switched into it, and orphan the first.
      def reject_when_logged_in!
        return unless logged_in?

        render_error(
          code: "already_authenticated",
          status: :forbidden,
          messages: ["You are already logged in"]
        )
      end

      # Mirrors UsersController#restricted_when_voting_open: once voting is
      # open and this user's swap is confirmed, their voting information is
      # frozen. The legacy version redirects; this reports the refusal.
      def reject_when_voting_info_locked!
        return unless voting_info_locked?

        render_error(
          code: "voting_info_locked",
          status: :forbidden,
          messages: ["It's election day and your swap is confirmed, so your " \
                     "details are locked."]
        )
      end

      def render_error(code:, status:, messages: [], fields: {})
        render json: {
          error: {
            code: code,
            messages: messages.map { |message| plain_text(message) },
            fields: fields.transform_values do |values|
              Array(values).map { |value| plain_text(value) }
            end
          }
        }, status: status
      end

      # Validation messages can carry markup: UserErrorsConcern builds its
      # "email already taken" message with link_to. JSON is not a template, so
      # a tag would reach React as literal text. Stripping here rather than in
      # render_record_invalid covers every error the API emits, including
      # Api::V1::UsersController, which renders its validation failures itself
      # instead of raising.
      def plain_text(message)
        ActionController::Base.helpers.strip_tags(message.to_s)
      end

      def render_not_found(_exception)
        render_error(
          code: "not_found",
          status: :not_found,
          messages: ["Not found."]
        )
      end

      def render_record_invalid(exception)
        render_error(
          code: "validation_failed",
          status: :unprocessable_entity,
          messages: exception.record.errors.full_messages,
          fields: exception.record.errors.to_hash(true)
        )
      end

      # RecordNotUnique carries the raw database error, not a validated
      # record, so unlike render_record_invalid this cannot say which field
      # collided.
      def render_record_not_unique(_exception)
        render_error(
          code: "validation_failed",
          status: :unprocessable_entity,
          messages: ["Those details are already in use"]
        )
      end
    end
  end
end
