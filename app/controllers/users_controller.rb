class UsersController < ApplicationController
  before_action :require_login, except: [:new]
  before_action :require_swapping_open, only: :show
  before_action :restricted_when_voting_open, only: [:edit, :update, :destroy]
  before_action :hide_polls?, only: [:show]

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

  # rubocop:disable Metrics/MethodLength
  def update
    review_required = false
    if params[:user]
      @user.assign_attributes(user_params)
      review_required = @user.swap_profile_changed?
      @user.save
    end

    if !phone_param.blank? && @user.mobile_number != phone_param
      begin
        @user.mobile_number = phone_param
      rescue ActiveRecord::RecordInvalid
        flash[:errors] = @user.mobile_phone.errors.full_messages
      end
    end

    unless @user.willing_party
      (flash[:errors] ||= []).append "You must state which party you are willing to vote for."
    end
    unless @user.preferred_party
      (flash[:errors] ||= []).append "You must state which party you would prefer to vote for."
    end

    no_flash_errors = (!flash[:errors] || flash[:errors].size.zero?)

    if @user.valid? && no_flash_errors && review_required
      redirect_to review_user_path and return
    end

    flash[:errors] = @user.errors.full_messages unless @user.valid?

    redirect_to redirect_path
  end

  def redirect_path
    # If the user came from the edit path, and the mobile still needs verification, return there
    if params[:user] && mobile_set_but_not_verified?
      flash[:errors] = ["Please click the Verify button to verify the mobile phone number you provided."]
      return edit_user_path
    end

    return edit_user_path unless @user.valid?

    # Otherwise, return to the user path - user will see a verification prompt if needed
    user_path
  end

  def destroy
    @user.destroy
    session[:user_id] = nil
    redirect_to account_deleted_path
  end

  private

  def restricted_when_voting_open
    redirect_to user_path if voting_info_locked?
  end

  def user_params
    params.require(:user).permit(:preferred_party_id, :willing_party_id, :constituency_ons_id, :email,
                                 :consent_news_email)
  end

  def phone_param
    return params[:mobile_phone][:number] if params[:mobile_phone] && params[:mobile_phone][:number]

    (params[:mobile_phone] || {})[:full]
  end
end
