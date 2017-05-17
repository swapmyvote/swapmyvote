class User < ActiveRecord::Base
  belongs_to :preferred_party, class_name: "Party"
  belongs_to :willing_party, class_name: "Party"
  belongs_to :constituency
  
  belongs_to :outgoing_swap, class_name: "Swap", foreign_key: "swap_id"
  has_one    :incoming_swap, class_name: "Swap", foreign_key: "chosen_user_id"
  
  has_many :potential_swaps, foreign_key: "source_user_id", dependent: :destroy
  has_many :incoming_potential_swaps, class_name: "PotentialSwap", foreign_key: "target_user_id", dependent: :destroy
  
  before_save :clear_swap, if: :details_changed?
  before_save :send_welcome_email, if: :ready_to_swap?
  before_destroy :clear_swap
  
  def self.from_omniauth(auth)
    where(provider: auth.provider, uid: auth.uid).first_or_initialize.tap do |user|
      user.name = auth.info.name
      user.image = auth.info.image
      if !auth.info.email.blank?
        user.email = auth.info.email
      end
      user.token = auth.credentials.token
      if auth.credentials.expires_at
        user.expires_at = Time.at(auth.credentials.expires_at)
      end
      user.save!
    end
  end
  
  def profile_url
    if self.provider == "facebook"
      return "https://facebook.com/#{self.uid}"
    elsif self.provider == "twitter"
      return "https://twitter.com/intent/user?user_id=#{self.uid}"
    else
      return "#"
    end
  end

  def image_url
    self.image.gsub(/^http/, "https")
  end

  def potential_swap_users(number = 5)
    # Clear out swaps each day to keep the list fresh for people checking back
    self.potential_swaps.where(['created_at < ?', DateTime.now - 1.day]).destroy_all
    self.create_potential_swaps(number)
    swaps = self.potential_swaps.all.eager_load(
      target_user: {constituency: [{polls: :party}]}
    )
    return swaps.map {|s| s.target_user}
  end
 
  def create_potential_swaps(number = 5)
    max_attempts = number * 2
    while (self.potential_swaps(true).count < number)
      self.try_to_create_potential_swap
      max_attempts -= 1
      break if max_attempts <= 0
    end
  end
  
  def try_to_create_potential_swap
    swaps = User.where(
      preferred_party_id: self.willing_party_id,
      willing_party_id: self.preferred_party_id
    ).where.not({constituency_id: nil})
    offset = rand(swaps.count)
    target_user = swaps.offset(offset).limit(1).first
    return nil if !target_user
    # Don't include if already swapped
    return nil if target_user.swap
    # Ignore if already included
    return nil if self.potential_swaps.exists?(target_user: target_user)
    # Ignore if me
    return nil if target_user.id == self.id
    # Success
    return self.potential_swaps.create(target_user: target_user)
  end
  
  def destroy_all_potential_swaps
    PotentialSwap.destroy(self.potential_swaps.pluck(:id))
    PotentialSwap.destroy(self.incoming_potential_swaps.pluck(:id))
  end
  
  def swap_with_user_id(user_id)
    other_user = User.find(user_id)
    if self.outgoing_swap or self.incoming_swap
      self.errors.add :base, "Choosing user is already swapped"
      return
    elsif other_user.outgoing_swap or other_user.incoming_swap
      self.errors.add :base, "Chosen user is already swapped"
      return
    end

    self.destroy_all_potential_swaps
    other_user.destroy_all_potential_swaps
    
    UserMailer.confirm_swap(other_user, self).deliver_now

    self.create_outgoing_swap chosen_user: other_user, confirmed: false
    self.save
  end
  
  def swapped_with
    if self.outgoing_swap
      return self.outgoing_swap.chosen_user
    elsif self.incoming_swap
      return self.incoming_swap.choosing_user
    else
      return nil
    end
  end
  
  def is_swapped?
    return !!self.swapped_with
  end
  
  def swap
    self.incoming_swap || self.outgoing_swap
  end
  
  def swap_confirmed?
    self.swap.try(:confirmed)
  end
  
  def confirm_swap
    self.incoming_swap.update(confirmed: true)
    UserMailer.swap_confirmed(self, self.swapped_with).deliver_now
    UserMailer.swap_confirmed(self.swapped_with, self).deliver_now
  end
  
  def clear_swap
    if self.incoming_swap
      self.incoming_swap.destroy
    end
    if self.outgoing_swap
      self.outgoing_swap.destroy
    end
    self.incoming_potential_swaps.destroy_all
    self.potential_swaps.destroy_all
  end
  
  def details_changed?
    self.preferred_party_id_changed? or self.willing_party_id_changed? or self.constituency_id_changed?
  end
  
  def ready_to_swap?
    ready =
      !self.preferred_party_id.blank? &&
      !self.willing_party_id.blank? &&
      !self.constituency_id.blank?
    first_time =
      self.preferred_party_id_was.blank? ||
      self.willing_party_id_was.blank? ||
      self.constituency_id_was.blank?
    return (ready and first_time)
  end
  
  def send_welcome_email
    logger.debug "Sending Welcome email"
    UserMailer.welcome_email(self).deliver_now
  end
end
