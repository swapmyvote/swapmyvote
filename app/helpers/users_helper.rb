module UsersHelper
  def user_profile_link(user)
    user.profile_url.blank? ? user.name : link_to(user.name, user.profile_url)
  end

  def contact_methods(user)
    methods = social_contact_methods(user)

    if user.email.present? && (user.email_consent? || user.email_login?)
      methods << "by email at " + link_to(user.email, user.email_url)
    end

    return methods
  end

  private

  def social_contact_methods(user)
    return [] unless user.profile_url.present?

    case user.identity&.provider
    when "twitter"
      return [link_to("on Twitter", user.profile_url)]
    when "facebook"
      return [link_to("on Facebook", user.profile_url) +
              " (although " +
              link_to("unfortunately this may not work",
                      faq_path + "#facebook-profile") + ")"]
    else
      return []
    end
  end
end
