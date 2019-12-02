module ApplicationHelper
  def facebook_login_path
    "/auth/facebook"
  end

  def twitter_login_path
    "/auth/twitter"
  end

  def current_user
    return @current_user unless @current_user.nil?

    return nil unless session.key?(:user_id)

    @current_user = User.find_by_id(session[:user_id])
    return @current_user
  end

  def logged_in?
    return !current_user.nil?
  end

  def swapping_open?
    return true if session[:sesame] == "open" # someone said the magic word
    return !ENV["SWAPS_CLOSED"]
  end

  def canonical_name(name)
    return nil if name.nil?
    return name.parameterize(separator: "_")
  end

  def github_url
    return "https://github.com/swapmyvote/swapmyvote/"
  end

  def mobile_verified?
    return current_user&.mobile_phone&.verified
  end

  def mobile_set_but_not_verified?
    return current_user&.mobile_phone &&
           !current_user.mobile_phone.verified
  end

  # Helpers for deciding which login methods to display in the login
  # modal dialog.  It's useful to restrict this to a particular
  # authentication type when leading an existing user back to login
  # from an email or SMS, to ensure they log in with the same identity
  # provider they used previously.  If params[:log_in_with] is
  # specified then the login modal dialog will be shown automatically.
  # Valid values are:
  #
  #   - "any" - all login methods are shown
  #   - "facebook" or "twitter - only that login method is shown
  #
  # If params[:log_in_with] is not specified then all login methods
  # will be shown but the dialog is not shown automatically.

  def log_in_with_facebook?
    return false if %w[all facebook].include? ENV["DISABLE_LOG_INS"]
    return true unless params[:log_in_with]
    return %w[any facebook].include? params[:log_in_with]
  end

  def log_in_with_twitter?
    return false if %w[all twitter].include? ENV["DISABLE_LOG_INS"]
    return true unless params[:log_in_with]
    return %w[any twitter].include? params[:log_in_with]
  end

  def log_in_method_unrestricted?
    return false if ENV["DISABLE_LOG_INS"]
    return !params[:log_in_with] || params[:log_in_with] == "any"
  end

  def log_in_methods
    methods = []
    methods << "Facebook" if log_in_with_facebook?
    methods << "Twitter" if log_in_with_twitter?
    methods.join(" or ")
  end

  def app_tagline
    [
      "Join me in making our votes count for more!",
      "Turn tactical voting into a win-win!",
    ].sample
  end
end
