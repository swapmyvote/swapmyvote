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
    @mobile_number = @user.mobile_number
    @parties = Party.all
    @constituencies = Constituency.all.order(:name)
  end

  def update
    @user.update(user_params)
    if phone_param && @user.mobile_number != phone_param
      begin
        @user.mobile_number = phone_param
      rescue ActiveRecord::RecordInvalid
        flash[:errors] = @user.mobile_phone.errors.full_messages
        redirect_to edit_user_path
        return
      end
    end
    redirect_to user_path
  end

  def destroy
    @user.destroy
    session[:user_id] = nil
    redirect_to account_deleted_path
  end

  private

  def user_params
    params.require(:user).permit(:preferred_party_id, :willing_party_id,
                                 :constituency_id, :email)
  end

  def phone_param
    (params[:mobile_phone] || {})[:number]
  end
end
