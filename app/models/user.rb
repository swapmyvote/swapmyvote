class User < ActiveRecord::Base
  belongs_to :preferred_party, class_name: "Party"
  belongs_to :willing_party, class_name: "Party"
  belongs_to :constituency
  
  belongs_to :outgoing_swap, class_name: "Swap", foreign_key: "swap_id"
  has_one    :incoming_swap, class_name: "Swap", foreign_key: "chosen_user_id"
  
  has_many :potential_swaps, foreign_key: "source_user_id"
  has_many :incoming_potential_swaps, class_name: "PotentialSwap", foreign_key: "target_user_id"
  
  before_save :clear_swap, if: :details_changed?
  
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
  
  def is_in_demand?
    my_group_size = User.where(
      preferred_party_id: self.preferred_party_id,
      willing_party_id: self.willing_party_id
    ).count
    swap_group_size = User.where(
      preferred_party_id: self.willing_party_id,
      willing_party_id: self.preferred_party_id
    ).count
    return my_group_size < swap_group_size
  end
  
  def potential_swap_users(number = 5)
    count = self.potential_swaps.count
    if count < number
      (number - count).times do
        self.create_potential_swap
      end
    end
    swaps = self.potential_swaps.all.eager_load(
      target_user: {constituency: [{polls: :party}]}
    )
    return swaps.map {|s| s.target_user}
  end
  
  def create_potential_swap
    swaps = User.where(
      preferred_party_id: self.willing_party_id,
      willing_party_id: self.preferred_party_id
    )
    offset = rand(swaps.count)
    target_user = swaps.offset(offset).limit(1).first
    return nil if !target_user
    self.potential_swaps.create(target_user: target_user)
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
  
  def clear_swap
    if self.incoming_swap
      self.incoming_swap.destroy
    end
    if self.outgoing_swap
      self.outgoing_swap.destroy
    end
  end
  
  def details_changed?
    self.preferred_party_id_changed? or self.willing_party_id_changed? or self.constituency_id_changed?
  end
end
