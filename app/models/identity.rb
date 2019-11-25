class Identity < ApplicationRecord
  belongs_to :user

  enum provider: %i[
    twitter
    facebook
  ]

  def self.from_omniauth(auth, user_id)
    where(provider: auth.provider, uid: auth.uid).first_or_initialize.tap do |identity|
      identity.nickname = auth.info.nickname
      identity.image_url = auth.info.image .gsub(/^http:/, "https:")

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
end
