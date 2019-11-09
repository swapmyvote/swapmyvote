class SessionsController < ApplicationController
  def create
    user = User.from_omniauth(request.env["omniauth.auth"])
    session[:user_id] = user.id
    redirect_to return_to_url
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
