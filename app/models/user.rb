class User < ActiveRecord::Base
  belongs_to :preferred_party, class_name: "Party"
  belongs_to :willing_party, class_name: "Party"
  belongs_to :constituency
  
  def self.from_omniauth(auth)
    where(provider: auth.provider, uid: auth.uid).first_or_initialize.tap do |user|
      user.name = auth.info.name
      user.image = auth.info.image
      user.email = auth.info.email
      user.token = auth.credentials.token
      if auth.credentials.expires_at
        user.expires_at = Time.at(auth.credentials.expires_at)
      end
      user.save!
    end
  end
end
