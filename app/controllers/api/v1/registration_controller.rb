module Api
  module V1
    # Creates an account from the React sign-up screen and signs it in.
    #
    # Ports Users::RegistrationsController#create. As there, the entry form's
    # answers are read from the session rather than sent by the client — that
    # controller merges session[:user_params], this one reads the
    # session[:pre_populate] stash the SPA's entry form writes.
    class RegistrationController < BaseController
      include SessionPayload

      before_action :require_logins_open!
      before_action :reject_when_logged_in!, only: :create
      before_action :reject_honeypot!

      def create
        user = User.new(registration_params.merge(pre_populated_attributes))
        user.save!

        # No remember_me here, unlike login: Devise's own sign_up never
        # remembered a new account — only the login *form* sent remember_me: 1
        # — so registering should not hand out a two-week persistent cookie
        # that POST /users does not.
        #
        # `event: :authentication` fires Devise's after_authentication hooks,
        # csrf_cleaner among them, so the CSRF token rotates as it does on the
        # legacy path.
        sign_in(user, event: :authentication)
        session.delete(:pre_populate)

        render_session_payload(status: :created)
      end

      private

      # `name` defaults to "" rather than being left absent: a body with no
      # `name` key at all hands User#check_name_is_not_email a nil, and its
      # unguarded name.include?("@") raises NoMethodError — a 500 where the
      # presence validation should have given a 422. An empty string validates
      # normally.
      def registration_params
        params.permit(:name, :email, :password, :password_confirmation,
                      :consent_news_email, :consent_to_data_processing)
              .reverse_merge(name: "")
      end

      # invisible_captcha renders a randomly-named field from a view helper, so
      # it cannot cross to a JSON API. The React form carries a permanently
      # hidden `swap_reference` input instead; only a bot fills it in. The name
      # is deliberately meaningless — anything a browser or password manager
      # recognises as an autocomplete token (`nickname` is a standard one)
      # risks being filled in for a real user, who would then get a 422 they
      # can neither see nor clear. The legacy HAML controller keeps using the
      # gem, untouched.
      def reject_honeypot!
        return if params[:swap_reference].blank?

        render_error(
          code: "spam_detected",
          status: :unprocessable_entity,
          messages: ["Something went wrong - please try that again"]
        )
      end

      # The entry form's answers, stashed either by
      # Api::V1::PrePopulateController or by the legacy /swap deep link.
      # Anything that resolves to nothing is dropped rather than treated as an
      # error: the stash is a convenience, and the same fields can be set
      # afterwards on the profile screen.
      def pre_populated_attributes
        stash = session[:pre_populate]
        return {} if stash.blank?

        stash = stash.with_indifferent_access
        {
          # Already handles the deep link's `constituency_name` alternative.
          constituency_ons_id: default_ons_constituency&.ons_id,
          preferred_party_id: party_id_for(stash[:preferred_party_name]),
          willing_party_id: party_id_for(stash[:willing_party_name])
        }.compact
      end

      # Matched canonically, not by equality: the deep link stores whatever a
      # partner site sent, so "green-party" and "Green Party" both have to find
      # the Green party. Same rule as
      # HomeController#prepopulate_fields_from_session.
      def party_id_for(name)
        return nil if name.blank?

        wanted = canonical_name(name)
        Party.all.find { |party| canonical_name(party.name) == wanted }&.id
      end
    end
  end
end
