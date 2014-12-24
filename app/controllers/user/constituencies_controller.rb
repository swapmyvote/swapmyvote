class User::ConstituenciesController < ApplicationController
  before_action :require_login
  
  def edit
    @constituencies = Constituency.all
  end
  
  def update
    @user.update(user_params)
    redirect_to user_share_path
  end
  
private
  def user_params
    params.require(:user).permit(:constituency_id)
  end
end
