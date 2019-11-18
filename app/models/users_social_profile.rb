class UsersSocialProfile < ApplicationRecord
  belongs_to :user

  delegate :uid, to: :user, prefix: false

  enum provider: %i[
    twitter
    facebook
  ]

  def self.from_omniauth(auth, user)
    where(provider: auth.provider, uid: auth.uid, user_id: user.id).first_or_initialize.tap do |usp|
      usp.nickname = auth.info.nickname
      usp.save!
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
