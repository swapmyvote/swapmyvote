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
      include Devise::Controllers::Rememberable

      before_action :require_logins_open!
      before_action :reject_honeypot!

      def create
        user = User.new(registration_params.merge(pre_populated_attributes))
        user.save!

        sign_in(user)
        remember_me(user)
        session.delete(:pre_populate)

        render json: session_payload, status: :created
      end

      private

      def registration_params
        params.permit(:name, :email, :password, :password_confirmation,
                      :consent_news_email, :consent_to_data_processing)
      end

      # invisible_captcha renders a randomly-named field from a view helper, so
      # it cannot cross to a JSON API. The React form carries a permanently
      # hidden `nickname` input instead; only a bot fills it in. The legacy
      # HAML controller keeps using the gem, untouched.
      def reject_honeypot!
        return if params[:nickname].blank?

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
