class UsersController < ApplicationController
  before_action :require_login
  
  def new
    print "Session", session[:user_params]
    @user_params = session[:user_params] || {}
    session.delete(:user_params)
    print @user_params
    if !@user_params.has_key?("preferred_party_id") or !@user_params.has_key?("willing_party_id")
      redirect_to root_path
      return
    end
  end
  
  def create
    if @user.update(user_params)
      redirect_to user_path
    end
  end
  
  def show
  end
  
private
  def require_login
    if !logged_in?
      print "NOT LOGGED IN", session, current_user
      session[:user_params] = user_params
      session[:return_to] = new_user_path
      redirect_to facebook_login_path
      return
    end
    @user = current_user
  end

  def user_params
    params.require(:user).permit(:preferred_party_id, :willing_party_id)
  end
end
