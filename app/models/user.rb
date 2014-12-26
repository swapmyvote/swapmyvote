class User < ActiveRecord::Base
  belongs_to :preferred_party, class_name: "Party"
  belongs_to :willing_party, class_name: "Party"
  belongs_to :constituency
  
  belongs_to :swap
  
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
  
  def is_in_demand
    my_group_size = User.where(
      preferred_party_id: self.preferred_party_id,
      willing_party_id: self.willing_party_id
    ).count
    swap_group_size = User.where(
      preferred_party_id: self.willing_party_id,
      willing_party_id: self.preferred_party_id
    ).count
    print "My group: #{my_group_size}, #{swap_group_size}\n"
    return my_group_size < swap_group_size
  end
  
  def potential_swaps(count)
    User.where(
      preferred_party_id: self.willing_party_id,
      willing_party_id: self.preferred_party_id
    ).limit(count)
  end
  
  def swap_with_user_id(user_id)
    other_user = User.find(user_id)
    if self.swap or Swap.find_by(chosen_user_id: self.id)
      self.errors.add :base, "Choosing user is already swapped"
      return
    elsif other_user.swap or Swap.find_by(chosen_user_id: other_user.id)
      self.errors.add :base, "Chosen user is already swapped"
      return
    end
    self.create_swap chosen_user: other_user, confirmed: false
    self.save
  end
end
