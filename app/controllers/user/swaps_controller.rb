class User::SwapsController < ApplicationController
  before_action :require_swapping_open, only: [:show, :new, :create]
  before_action :require_login
  before_action :assert_incoming_swap_exists, only: [:update, :destroy]
  before_action :assert_parties_exist, only: [:show]
  before_action :assert_mobile_phone_verified, only: [:new, :create]

  include UsersHelper

  def show
    if @user.swapped?
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
    unless @user.errors.empty?
      flash[:errors] = @user.errors.full_messages
    end
    redirect_to user_path
  end

  def update
    if swap_params[:confirmed] == "true"
      @user.confirm_swap
    end
    redirect_to user_path
  end

  def destroy
    @user.clear_swap
    redirect_to user_path
  end

  private

  def assert_mobile_phone_verified
    return if @user.verified

    flash[:errors] = ["Please verify your mobile phone number before you swap!"]
    redirect_to edit_user_path
  end

  def assert_incoming_swap_exists
    return if @user.incoming_swap
    flash[:errors] = ["You don't have a swap!"]
    redirect_to user_path
  end

  def assert_parties_exist
    return if @user.willing_party && @user.preferred_party
    redirect_to edit_user_path
  end

  def swap_params
    params.require(:swap).permit(:confirmed)
  end
end
