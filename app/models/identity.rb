class Identity < OmniAuth::Identity::Models::ActiveRecord
  belongs_to :user

  enum provider: %i[
    twitter
    facebook
    identity
  ]

  def self.from_omniauth(auth, user_id)
    where(provider: auth.provider, uid: auth.uid).first_or_initialize.tap do |identity|
      identity.image_url = auth.info.image
      identity.name = auth.info.name
      identity.email = auth.info.email unless auth.info.email.blank?
      identity.user_id = user_id

      if auth.provider == "facebook"
        url = auth.info.dig(:urls, :Facebook)
        # It looks like auth.dig(:extra, :raw_info, :link) would also work here.
        identity.profile_url = url unless url.blank?
      end

      identity.save!
    end
  end

  def profile_url
    return self[:profile_url] unless self[:profile_url].blank?

    case provider
    when "twitter"
      "https://twitter.com/intent/user?user_id=#{uid}"
    else
      "#"
    end
  end
end
