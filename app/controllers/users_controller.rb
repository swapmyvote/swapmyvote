class UsersController < ApplicationController
  before_action :require_login, except: [:new]
  before_action :disable_edits_on_swaps_closed, only: [:edit, :update]

  def new
    @identity = request.env["omniauth.identity"]
  end

  def show
    @mobile_number = @user.mobile_number
    if !@user.constituency || @user.email.blank?
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
    @constituencies = OnsConstituency.all.order(:name)
  end

  def update
    @user.update(user_params) if params[:user]
    if !phone_param.blank? && @user.mobile_number != phone_param
      begin
        @user.mobile_number = phone_param
      rescue ActiveRecord::RecordInvalid
        flash[:errors] = @user.mobile_phone.errors.full_messages
      end
    end

    redirect_to redirect_path
  end

  def redirect_path
    # If the user came from the edit path, and the mobile still needs verification, return there
    return edit_user_path if params[:user] && mobile_set_but_not_verified?
    # Otherwise, return to the user path - user will see a verification prompt if needed
    user_path
  end

  def destroy
    @user.destroy
    session[:user_id] = nil
    redirect_to account_deleted_path
  end

  private

  def disable_edits_on_swaps_closed
    redirect_to user_path unless swapping_open?
  end

  def user_params
    params.require(:user).permit(:preferred_party_id, :willing_party_id, :constituency_ons_id, :email)
  end

  def phone_param
    return params[:mobile_phone][:number] if params[:mobile_phone] && params[:mobile_phone][:number]

    (params[:mobile_phone] || {})[:full]
  end
end
