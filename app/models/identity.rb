class Identity < ApplicationRecord
  belongs_to :user

  enum provider: %i[
    twitter
    facebook
  ]

  def self.from_omniauth(auth, user_id)
    where(provider: auth.provider, uid: auth.uid).first_or_initialize.tap do |identity|
      identity.image = auth.info.image.gsub(/^http:/, "https:")
      identity.name = auth.info.name
      identity.nickname = auth.info.nickname
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
      "https://facebook.com/#{nickname}"
    else
      "#"
    end
  end

  def image_url
    image.gsub(/^http:/, "https:")
  end
end
