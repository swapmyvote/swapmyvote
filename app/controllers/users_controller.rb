class UsersController < ApplicationController
  before_action :require_login

  def show
    if !@user.constituency || !@user.email
      redirect_to edit_user_constituency_path
      return
    end
    if @user.swapped?
      render "show"
    else
      redirect_to user_swap_path
    end
  end

  # Users can get here from the "Not right? Update your info" link
  def edit
    @parties = Party.all
    @constituencies = Constituency.all.order(:name)
  end

  def update
    @user.update(user_params)
    redirect_to user_path
  end

  def destroy
    @user.destroy
    session[:user_id] = nil
    redirect_to account_deleted_path
  end

  private

  def user_params
    params.require(:user).permit(:preferred_party_id, :willing_party_id, :constituency_id, :email)
  end
end
