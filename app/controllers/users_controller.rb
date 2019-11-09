class UsersController < ApplicationController
  before_action :require_login_and_save_user_params, only: :create
  before_action :require_login, except: :create

  def new
    @user_params = session[:user_params] || {}
    session.delete(:user_params)
    return if @user_params.has_key?("preferred_party_id") &&
              @user_params.has_key?("willing_party_id")
    redirect_to root_path
  end

  def create
    @user.update(user_params)
    redirect_to user_path
  end

  def show
    if !@user.constituency || !@user.email
      redirect_to edit_user_constituency_path
      return
    end
    if @user.is_swapped?
      render "show"
    else
      redirect_to user_swap_path
    end
  end

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

  # The home page sends us to user/create, but if we're not logged in
  # we need to first divert and do that, then come back to the user/new page
  # with the constituency still populated. To keep that data around, we save
  # it into the session here.
  def require_login_and_save_user_params
    logged_in = require_login()
    return if logged_in

    # Set params to resume user creation after login
    session[:user_params] = user_params
    session[:return_to] = new_user_path
  end

  def user_params
    params.require(:user).permit(:preferred_party_id, :willing_party_id, :constituency_id, :email)
  end
end
