class User::SwapsController < ApplicationController
  before_action :require_login
  before_action :assert_incoming_swap_exists, :only => [:update, :destroy]

  def show
    if @user.is_swapped?
      redirect_to user_path
      return
    end
    @potential_swaps = @user.potential_swap_users(5)
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
    if (swap_params[:confirmed] == "true")
      @user.confirm_swap
    end
    redirect_to user_path  
  end
  
  def destroy
    @user.clear_swap
    redirect_to user_path
  end
  
private
  def assert_incoming_swap_exists
    if !@user.incoming_swap
      flash[:errors] = "You don't have a swap!"
      redirect_to user_path
    end
  end

  def swap_params
    params.require(:swap).permit(:confirmed)
  end
end
