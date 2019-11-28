class UsersController < ApplicationController
  before_action :require_login, except: [:new]

  def new
    @identity = request.env['omniauth.identity']
    logger.info @identity
  end

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
    @constituencies = OnsConstituency.all.order(:name)
  end

  def update
    @user.update(user_params)
    if !phone_param.blank? && @user.mobile_number != phone_param
      begin
        @user.mobile_number = phone_param
      rescue ActiveRecord::RecordInvalid
        flash[:errors] = @user.mobile_phone.errors.full_messages
        redirect_to edit_user_path
        return
      end
    end

    # Need to give user chance to verify mobile number if required
    redirect_to mobile_needs_verification? ? edit_user_path : user_path
  end

  def destroy
    @user.destroy
    session[:user_id] = nil
    redirect_to account_deleted_path
  end

  private

  def user_params
    params.require(:user).permit(:preferred_party_id, :willing_party_id, :constituency_ons_id, :email)
  end

  def phone_param
    # We get the value from mobile_phone[full] on the form, intl-tel-input
    # will put a normalised version of the number (with IDD code) there for us.
    (params[:mobile_phone] || {})[:full]
  end
end
