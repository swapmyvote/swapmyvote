module UsersHelper
  def potential_swap_expiry_mins
    env_expiry_mins = ENV["POTENTIAL_SWAP_EXPIRY_MINS"]
    return env_expiry_mins.blank? ? 120 : env_expiry_mins.to_i
  end

  def user_profile_link(user)
    user.profile_url.blank? ? user.name : link_to(user.name, user.profile_url)
  end

  def contact_methods(user)
    methods = social_contact_methods(user)

    if user.email.present? && user.email_consent?
      methods << "by email at " + link_to(user.email, user.email_url)
    end

    return methods
  end

  private

  def social_contact_methods(user)
    return [] unless user.profile_url.present?

    case user.identity&.provider
    when "twitter"
      return [link_to("on Twitter", user.profile_url, target: "_blank")]
    when "facebook"
      return [facebook_contact_method(user)]
    else
      return []
    end
  end

  def facebook_contact_method(user)
    link_to("on Facebook", user.profile_url, target: "_blank") +
      " (although " +
      link_to("unfortunately this may not work",
              # has to be _url not _path to work from ActionMailer
              faq_url + "#facebook-profile",
              target: "_blank") +
      ")"
  end
end
