class User::ConstituenciesController < ApplicationController
  before_action :require_swapping_open
  before_action :require_login

  def edit
    @constituencies = OnsConstituency.all.order(:name)
    @default_constituency_ons_id = @user.constituency_ons_id ||
                                   default_ons_constituency&.ons_id
  end

  def update
    @user.update(user_params)
    redirect_to user_swap_path
  end

  private

  def user_params
    params.require(:user).permit(:constituency_ons_id, :email)
  end
end
