class UsersController < ApplicationController
  before_action :require_login
  
  def new
    @user_params = session[:user_params] || {}
    session.delete(:user_params)
    if !@user_params.has_key?("preferred_party_id") or !@user_params.has_key?("willing_party_id")
      redirect_to root_path
      return
    end
  end
  
  def create
    @user.update(user_params)
    redirect_to user_path
  end
  
  def show
    if !@user.constituency or !@user.email
      redirect_to edit_user_constituency_path
      return
    end
    if @user.is_in_demand
      render "choose_swap"
    else
      render "show"
    end
  end
  
  def edit
    @parties = Party.all
    @constituencies = Constituency.all
  end
  
  def update
    @user.update(user_params)
    redirect_to user_path
  end
  
private
  def require_login
    logged_in = super()
    if !logged_in
      # Set params to resume user creation after login
      session[:user_params] = user_params
      session[:return_to] = new_user_path
    end
  end

  def user_params
    params.require(:user).permit(:preferred_party_id, :willing_party_id, :constituency_id)
  end
end
