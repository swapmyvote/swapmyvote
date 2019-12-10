class Users::OmniauthCallbacksController < Devise::OmniauthCallbacksController
  def twitter
    callback(:twitter)
  end

  def facebook
    callback(:facebook)
  end

  def callback(_provider)
    user = new_or_existing(request.env["omniauth.auth"])

    sign_in(user)
    user_params = session.delete(:user_params)
    user.update(user_params) if user_params
    origin = request.env["omniauth.origin"]
    logger.debug "Login request origin #{origin}"
    redirect_to origin || user_path
  rescue ActiveRecord::RecordInvalid => ex
    auth = request.env["omniauth.auth"]
    flash[:alert] = alert_for_invalid_record(ex, auth)
    redirect_to auth&.provider == "devise_email" ?
                  new_user_session_path
                : root_path + "?log_in_with=any"
  end

  def alert_for_invalid_record(ex, auth)
    case ex.message
    when /Email can't be blank/
      alert = "Sorry, we need your email in order to continue."
      if auth&.provider == "facebook"
        alert << " Try <a href=\"#{facebook_app_settings}\" target=\"_blank\">" +
                 "removing this app from your Facebook settings</a> " +
                 "then trying again.".html_safe
      end
      alert
    when /Email has already been taken/
      "An account already exists with the email #{auth.info.email}. " \
      "Please log in to that account."
    else
      ex.message
    end
  end

  def facebook_app_settings
    "https://www.facebook.com/settings?tab=applications"
  end

  def new_or_existing(auth)
    user = user_for_identity(auth)
    return create_user_and_identity(auth) if user.blank?

    user.omniauth_tokens(auth)
    return user
  end

  def user_for_identity(auth)
    identities = Identity.where(provider: auth.provider, uid: auth.uid)

    return unless identities.any?

    identities.first&.user
  end

  def create_user_and_identity(auth)
    user = User.create(name: auth.info.name, email: auth.info.email,
                       constituency: default_ons_constituency)

    user.omniauth_tokens(auth)
    Identity.from_omniauth(auth, user.id)

    return user
  end

  def failure
    flash[:errors] = ["Login failed! Please try again, or try logging in a different way."]
    destroy
  end

  def destroy
    session[:user_id] = nil
    redirect_to root_url
  end
end
