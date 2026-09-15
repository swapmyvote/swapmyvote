class ApplicationController < ActionController::Base
  include ApplicationHelper

  # Prevent CSRF attacks by raising an exception.
  # For APIs, you may want to use :null_session instead.
  protect_from_forgery with: :exception

  # The phase override, honoured on every path rather than only the legacy
  # home page. `AppModeConcern#app_mode` prefers session[:sesame] over
  # ENV["SWAPMYVOTE_MODE"], and it validates the value — but lazily, on the
  # next read of `app_mode`, not here. This filter only stashes or clears the
  # raw param; an unknown mode sits in the session unnoticed until some later
  # request reads app_mode and raises (see spec/requests/app_mode_sesame_spec.rb).
  #
  # This lived on HomeController until swapmyvote/swapmyvote#1079. It moved up
  # because the React SPA is served by SpaController, and at cutover "/" is
  # SpaController too — leaving the lever on HomeController would have retired
  # it along with the legacy home page.
  before_action :whats_the_magic_word

  def handle_unverified_request
    flash[:errors] = ["Something went wrong - please try that again."]
    redirect_back fallback_location: root_path
  end

  def url_except_param(url, param)
    uri = Addressable::URI.parse(url)
    uri.query_values = uri.query_values.except(param.to_s)
    return uri.to_s.chomp("?")
  end

  def whats_the_magic_word
    if params.key?(:opensesame)
      session[:sesame] = params[:opensesame]
    elsif params.key?(:closesesame)
      session.delete :sesame
    end
  end
  # This file has no `private` section (every other method here is called
  # from views or subclasses), so mark this one method private explicitly
  # rather than introducing one. `before_action` runs private methods fine;
  # being public bought this nothing except joining `action_methods` on every
  # controller. Not routable (no `:controller/:action` wildcard in
  # config/routes.rb), so not exploitable, but there's no reason to leave it
  # public.
  private :whats_the_magic_word

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

  def require_logins_open
    return if logins_open?
    redirect_to root_path
  end

  def require_swapping_open
    return if swapping_open?
    redirect_to root_path
  end

  def voting_info_locked?
    voting_open? && current_user&.swap_confirmed?
  end

  def prepops
    return session["pre_populate"]
  end

  def default_ons_constituency
    return nil unless prepops

    return (prepops["constituency_ons_id"] &&
            OnsConstituency.find_by(ons_id: prepops["constituency_ons_id"])) ||
           (prepops["constituency_name"] &&
            OnsConstituency.find_by(name: prepops["constituency_name"]))
  end
end
