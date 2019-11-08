# frozen_string_literal: true

module ApplicationHelper
  def facebook_login_path
    '/auth/facebook'
  end

  def twitter_login_path
    '/auth/twitter'
  end

  def current_user
    if !@current_user.nil?
      @current_user
    elsif session.key?(:user_id)
      @current_user = User.find_by_id(session[:user_id])
      @current_user
    end
  end

  def logged_in?
    !!current_user
  end

  def swapping_open?
    !ENV['SWAPS_CLOSED']
  end

  def canonical_name(name)
    return nil if name.nil?

    name.parameterize('_')
  end
end
