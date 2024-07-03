class User::ConstituenciesController < ApplicationController
  before_action :require_swapping_open
  before_action :require_login

  def edit
    @constituencies = OnsConstituency.all.order(:name)
    @default_constituency_ons_id = @user.constituency_ons_id ||
                                   default_ons_constituency&.ons_id
  end

  def update
    ons_id = user_params[:constituency_ons_id]

    if !ons_id.nil? && !ons_id.empty?

      @user.update(user_params)
      redirect_to user_swap_path

    else

      flash.now[:errors] = ["You must tell us your constituency. Without it, the swaps we offer may not make sense."]
      edit
      render "edit"

    end
  end

  private

  def user_params
    params.require(:user).permit(:constituency_ons_id, :email)
  end
end
