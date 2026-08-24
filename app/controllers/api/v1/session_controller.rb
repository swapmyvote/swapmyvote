module Api
  module V1
    # The SPA's bootstrap endpoint, and the one place it learns who it is
    # talking as and which operational phase the site is in.
    #
    #   GET    /api/v1/session  — the payload (works logged out: currentUser nil)
    #   POST   /api/v1/session  — log in with an email and password
    #   DELETE /api/v1/session  — log out (CSRF-protected, login required)
    class SessionController < BaseController
      include SessionPayload
      include Devise::Controllers::Rememberable

      before_action :require_logins_open!, only: :create
      before_action :reject_when_logged_in!, only: :create
      before_action :require_logged_in!, only: :destroy

      def show
        render json: session_payload
      end

      # Devise's own `database_authenticatable` strategy is deliberately not
      # used here. Warden reads credentials through `Rack::Request#POST`, which
      # parses form and multipart bodies but not JSON — Rails puts a parsed
      # JSON body in `action_dispatch.request.request_parameters` instead — so
      # the strategy would see no credentials at all. Only
      # :database_authenticatable and :rememberable are enabled on User (no
      # :lockable, :confirmable or :timeoutable), so this is the whole of what
      # the strategy would have done.
      def create
        email = credentials[:email].to_s.downcase
        # A non-scalar `email` is dropped by `permit` and arrives here as "",
        # which `lower(email) = ?` would match against the blank-email rows a
        # social sign-up leaves behind. Refuse before the lookup rather than
        # leaning on Devise::Encryptor.compare short-circuiting on a blank
        # encrypted_password.
        return render_invalid_credentials if email.blank?

        user = User.find_by("lower(email) = ?", email)

        unless user&.valid_password?(credentials[:password].to_s)
          return render_invalid_credentials
        end

        # `event: :authentication` is what fires Devise's after_authentication
        # hooks — in particular csrf_cleaner, which drops session[:_csrf_token]
        # so the token rotates. warden.authenticate! does this for the legacy
        # POST /users/sign_in; a plain sign_in would not, leaving this endpoint
        # weaker than the one it replaces.
        sign_in(user, event: :authentication)
        # The legacy form always sent remember_me: 1, so logging in always
        # remembers. Registration deliberately does not — Devise's sign_up
        # never remembered either. Logging out clears the cookie through
        # Devise's forgetable hook, so there is no matching call in #destroy.
        remember_me(user)

        render_session_payload
      end

      def destroy
        sign_out(current_user)
        # Answer with a fresh payload rather than 204 so the SPA can prime its
        # session cache from the response instead of racing a refetch.
        render_session_payload
      end

      private

      def credentials
        params.permit(:email, :password)
      end

      # One body for every failure, so the endpoint cannot be used to find out
      # which email addresses have accounts.
      def render_invalid_credentials
        render_error(
          code: "invalid_credentials",
          status: :unauthorized,
          messages: ["Sorry, we could not log you in with those details"]
        )
      end
    end
  end
end
