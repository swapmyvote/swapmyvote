module UserErrorsConcern
  extend ActiveSupport::Concern

  included do
    include Rails.application.routes.url_helpers
    include ActionView::Helpers::UrlHelper
  end

  def email_uniqueness_errors(existing_user)
    # Delete the default message that gets added
    errors.delete(:email)

    # Add our custom one
    if existing_user.email_login?
      msg = "A user with this email address already exists. " +
            link_to("Log in instead.", new_user_session_path)
      errors.add(:base, msg.html_safe)
    else
      provider = existing_user.provider
      msg = "A user with this email address has already signed up using " +
            "#{provider.capitalize}.  If that's you, please " +
            link_to("log in via #{provider.capitalize}",
                    root_path + "?log_in_with=#{provider}") + "."
      errors.add(:base, msg.html_safe)
    end
  end
end
