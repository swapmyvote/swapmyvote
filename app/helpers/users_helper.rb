module UsersHelper
  def user_profile_link(user)
    user.profile_url.blank? ? user.name : link_to(user.name, user.profile_url)
  end
end
