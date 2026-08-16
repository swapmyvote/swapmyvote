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

      def render_error(code:, status:, messages: [], fields: {})
        render json: { error: { code: code, messages: messages, fields: fields } },
               status: status
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
    end
  end
end
