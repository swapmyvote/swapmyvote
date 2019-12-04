class SessionsController < ApplicationController
  def create
    user = new_or_existing(request.env["omniauth.auth"])

    session[:user_id] = user.id
    user_params = session.delete(:user_params)
    user.update(user_params) if user_params
    origin = request.env["omniauth.origin"]
    logger.debug "Login request origin #{origin}"
    redirect_to origin || user_path
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

  def retry
    flash[:errors] = ["Login failed! Please try again, or try logging in a different way."]
    destroy
  end

  def destroy
    session[:user_id] = nil
    redirect_to root_url
  end
end
