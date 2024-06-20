# frozen_string_literal: true

class Users::SessionsController < Devise::SessionsController
  before_action :require_logins_open
  before_action :configure_sign_in_params, only: [:create]

  # GET /resource/sign_in
  # def new
  #   super
  # end

  # POST /resource/sign_in
  def create
    # This is abusing REST a bit, but we use a POST for the button
    # on the homepage to navigate to the log in screen, so we can
    # pass in the parties, and store them in the session, like we do
    # with Facebook and Twitter. If we don't have data, they've
    # probably come from the nav bar, and want to log in. If they do
    # have the parties, they've probably come from the home page and
    # want to register, after stashing their parties on the session.
    # Otherwise it's a log-in request, and we can delegate to Devise.
    if !params[:user]
      redirect_to new_user_session_path
    elsif params[:user][:preferred_party_id] && params[:user][:willing_party_id]
      session[:user_params] = params[:user]
      redirect_to new_user_registration_path
    else
      params[:user].merge!(remember_me: 1)
      super
    end
  end

  # DELETE /resource/sign_out
  # def destroy
  #   super
  # end

  # protected

  # If you have extra params to permit, append them to the sanitizer.
  def configure_sign_in_params
    devise_parameter_sanitizer.permit(:sign_in, keys: [:preferred_party_id, :willing_party_id, :consent_news_email])
  end
end
