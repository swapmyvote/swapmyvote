class ApplicationController < ActionController::Base
  include ApplicationHelper
  
  # Prevent CSRF attacks by raising an exception.
  # For APIs, you may want to use :null_session instead.
  protect_from_forgery with: :exception
  
  def return_to_url
    url = session[:return_to] || root_url
    session.delete(:return_to)
    return url
  end

  def require_login
    if !logged_in?
      session[:return_to] = request.original_url
      if params[:log_in_with] == "twitter"
        redirect_to twitter_login_path
      elsif params[:log_in_with] == "facebook"
        redirect_to facebook_login_path
      else
        redirect_to root_path
      end
      return
    end
    @user = current_user
  end
end
