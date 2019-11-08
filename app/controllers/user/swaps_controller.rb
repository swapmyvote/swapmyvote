# frozen_string_literal: true

class User::SwapsController < ApplicationController
  before_action :require_swapping_open, only: %i[show new create]
  before_action :require_login
  before_action :assert_incoming_swap_exists, only: %i[update destroy]
  before_action :assert_parties_exist, only: [:show]

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
    flash[:errors] = @user.errors.full_messages unless @user.errors.empty?
    redirect_to user_path
  end

  def update
    @user.confirm_swap if swap_params[:confirmed] == "true"
    redirect_to user_path
  end

  def destroy
    @user.clear_swap
    redirect_to user_path
  end

  private

  def assert_incoming_swap_exists
    unless @user.incoming_swap
      flash[:errors] = ["You don't have a swap!"]
      redirect_to user_path
    end
  end

  def assert_parties_exist
    redirect_to edit_user_path if !@user.willing_party || !@user.preferred_party
  end

  def swap_params
    params.require(:swap).permit(:confirmed)
  end
end
