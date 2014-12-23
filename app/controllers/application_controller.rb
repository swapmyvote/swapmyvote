class ApplicationController < ActionController::Base
  include ApplicationHelper
  
  # Prevent CSRF attacks by raising an exception.
  # For APIs, you may want to use :null_session instead.
  protect_from_forgery with: :exception
  
  def current_user
    if !@current_user.nil?
      return @current_user
    elsif session.has_key?(:user_id)
      @current_user = User.find_by_id(session[:user_id])
      return @current_user
    else
      return nil
    end
  end
  
  def logged_in?
    return !!current_user
  end
  
  def return_to_url
    url = session[:return_to] || root_url
    session.delete(:return_to)
    return url
  end

  def require_login
    if !logged_in?
      redirect_to facebook_login_path
      return
    end
    @user = current_user
  end
end
