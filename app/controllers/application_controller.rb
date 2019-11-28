class ApplicationController < ActionController::Base
  include ApplicationHelper

  # Prevent CSRF attacks by raising an exception.
  # For APIs, you may want to use :null_session instead.
  protect_from_forgery with: :exception

  def url_except_param(url, param)
    uri = Addressable::URI.parse(url)
    uri.query_values = uri.query_values.except(param.to_s)
    return uri.to_s.chomp("?")
  end

  def require_login
    if logged_in?
      @user = current_user
      return
    end

    if params[:log_in_with]
      session[:return_to] = url_except_param(request.original_url, :log_in_with)
      logger.debug "After login will return to #{session[:return_to]}"
      redirect_to root_path(log_in_with: params[:log_in_with])
    else
      redirect_to root_path
    end
  end

  def require_swapping_open
    return if swapping_open?
    redirect_to root_path
  end

  def prepops
    return session["pre_populate"]
  end
end
