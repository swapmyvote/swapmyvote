# frozen_string_literal: true

class ApplicationController < ActionController::Base
  include ApplicationHelper

  # Prevent CSRF attacks by raising an exception.
  # For APIs, you may want to use :null_session instead.
  protect_from_forgery with: :exception

  def return_to_url
    url = session[:return_to] || root_url
    session.delete(:return_to)
    url
  end

  def url_except_param(url, param)
    uri = Addressable::URI.parse(url)
    uri.query_values = uri.query_values.except(param.to_s)
    uri.to_s.chomp("?")
  end

  def require_login
    unless logged_in?
      if params[:log_in_with]
        login
      else
        redirect_to root_path
      end
    end
    @user = current_user
  end

  def login
    session[:return_to] = url_except_param(request.original_url, :log_in_with)
    logger.debug "After login will return to #{session[:return_to]}"
    redirect_to root_path(log_in_with: params[:log_in_with])
  end

  def require_swapping_open
    redirect_to root_path unless swapping_open?
  end
end
