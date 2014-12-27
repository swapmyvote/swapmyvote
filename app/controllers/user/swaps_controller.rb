class User::SwapsController < ApplicationController
  before_action :require_login

  def show
    @potential_swaps = @user.potential_swaps.limit(5)
  end
  
  def new
    @swap_with = User.find(params[:user_id])
  end
  
  def create
    @user.swap_with_user_id(params[:user_id])
    if !@user.errors.empty?
      flash[:errors] = @user.errors.full_messages()
    end
    redirect_to user_path
  end
  
  def update
    if !@user.incoming_swap
      flash[:errors] = "You don't have a swap!"
      redirect_to user_path
      return
    end
    confirmed = (swap_params[:confirmed] == "true")
    print "CONFIRMED", confirmed
    @user.incoming_swap.update(confirmed: confirmed)    
    redirect_to user_path  
  end
  
private
  def swap_params
    params.require(:swap).permit(:confirmed)
  end
end
