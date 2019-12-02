class User::VoteController < ApplicationController
  before_action :require_login
  before_action :require_swap

  def show
  end

  def create
    @user.has_voted = true
    @user.save
    UserMailer.partner_has_voted(@user.swapped_with).deliver_now
    redirect_to user_vote_path
  end

  private

  def require_swap
    return if @user.swapped?
    redirect_to user_path
  end
end
