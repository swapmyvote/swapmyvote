class UsersController < ApplicationController
  before_action :require_login
  
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
      redirect_to facebook_login_path
    end
    @user = current_user
  end

  def user_params
    params.require(:user).permit(:preferred_party_id, :willing_party_id)
  end
end
