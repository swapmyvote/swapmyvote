class Identity < ApplicationRecord
  belongs_to :user

  enum provider: %i[
    twitter
    facebook
  ]

  def self.from_omniauth(auth, user_id)
    where(provider: auth.provider, uid: auth.uid).first_or_initialize.tap do |identity|
      identity.image_url = auth.info.image
      identity.name = auth.info.name
      identity.email = auth.info.email unless auth.info.email.blank?

      identity.user_id = user_id

      identity.save!
    end
  end

  def profile_url
    case provider
    when "twitter"
      "https://twitter.com/intent/user?user_id=#{uid}"
    when "facebook"
      # This is not the profile url, but will also not produce errors, and should only be temporary until
      # we have proper fb permissions
      "https://facebook.com/"
    else
      "#"
    end
  end
end
