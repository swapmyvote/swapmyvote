class User < ApplicationRecord
  belongs_to :preferred_party, class_name: "Party", optional: true
  belongs_to :willing_party, class_name: "Party", optional: true
  belongs_to :constituency, optional: true

  belongs_to :outgoing_swap, class_name: "Swap", foreign_key: "swap_id",
             dependent: :destroy, optional: true
  has_one    :incoming_swap, class_name: "Swap", foreign_key: "chosen_user_id",
             dependent: :destroy

  has_many :potential_swaps, foreign_key: "source_user_id", dependent: :destroy
  has_many :incoming_potential_swaps, class_name: "PotentialSwap", foreign_key: "target_user_id", dependent: :destroy

  before_save :clear_swap, if: :details_changed?
  before_save :send_welcome_email, if: :ready_to_swap?
  before_destroy :clear_swap

  def self.from_omniauth(auth)
    where(provider: auth.provider, uid: auth.uid).first_or_initialize.tap do |user|
      user.name = auth.info.name
      user.image = auth.info.image
      unless auth.info.email.blank?
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
    return "https://facebook.com/#{uid}" \
      if provider == "facebook"

    return "https://twitter.com/intent/user?user_id=#{uid}" \
      if provider == "twitter"

    return "#"
  end

  def image_url
    image.gsub(/^http/, "https")
  end

  def potential_swap_users(number = 5)
    # Clear out swaps every few hours to keep the list fresh for people checking back
    potential_swaps.where(["created_at < ?", DateTime.now - 2.hours]).destroy_all
    create_potential_swaps(number)
    swaps = potential_swaps.all.eager_load(
      target_user: { constituency: [{ polls: :party }] }
    )
    return swaps.map {|s| s.target_user}
  end

  def create_potential_swaps(number = 5)
    max_attempts = number * 2
    while potential_swaps.reload.count < number
      try_to_create_potential_swap
      max_attempts -= 1
      break if max_attempts <= 0
    end
  end

  def try_to_create_potential_swap
    swaps = User.where(
      preferred_party_id: willing_party_id,
      willing_party_id: preferred_party_id
    ).where.not({ constituency_id: nil })
    offset = rand(swaps.count)
    target_user = swaps.offset(offset).limit(1).first
    return nil unless target_user
    # Don't include if already swapped
    return nil if target_user.swap
    # Ignore if already included
    return nil if potential_swaps.exists?(target_user: target_user)
    # Ignore if me
    return nil if target_user.id == id
    # Success
    return potential_swaps.create(target_user: target_user)
  end

  def destroy_all_potential_swaps
    PotentialSwap.destroy(potential_swaps.pluck(:id))
    PotentialSwap.destroy(incoming_potential_swaps.pluck(:id))
  end

  def swap_with_user_id(user_id)
    other_user = User.find(user_id)
    if outgoing_swap || incoming_swap
      errors.add :base, "Choosing user is already swapped"
      return
    elsif other_user.outgoing_swap || other_user.incoming_swap
      errors.add :base, "Chosen user is already swapped"
      return
    end

    destroy_all_potential_swaps
    other_user.destroy_all_potential_swaps

    UserMailer.confirm_swap(other_user, self).deliver_now

    create_outgoing_swap chosen_user: other_user, confirmed: false
    save
  end

  def swapped_with
    return outgoing_swap.chosen_user if outgoing_swap
    return incoming_swap.choosing_user if incoming_swap
    return nil
  end

  def swapped?
    return !swapped_with.nil?
  end

  def swap
    incoming_swap || outgoing_swap
  end

  def swap_confirmed?
    swap.try(:confirmed)
  end

  def confirm_swap
    incoming_swap.update(confirmed: true)
    UserMailer.swap_confirmed(self, swapped_with).deliver_now
    UserMailer.swap_confirmed(swapped_with, self).deliver_now
  end

  def clear_swap
    if incoming_swap
      incoming_swap.destroy
    end
    if outgoing_swap
      outgoing_swap.destroy
    end
    incoming_potential_swaps.destroy_all
    potential_swaps.destroy_all
  end

  def details_changed?
    preferred_party_id_changed? || willing_party_id_changed? || constituency_id_changed?
  end

  def ready_to_swap?
    ready =
      !preferred_party_id.blank? &&
      !willing_party_id.blank? &&
      !constituency_id.blank?
    first_time =
      preferred_party_id_was.blank? ||
      willing_party_id_was.blank? ||
      constituency_id_was.blank?
    return (ready && first_time)
  end

  def send_welcome_email
    logger.debug "Sending Welcome email"
    UserMailer.welcome_email(self).deliver_now
  end

  def send_vote_reminder_email
    return if sent_vote_reminder_email
    self.sent_vote_reminder_email = true
    save
    UserMailer.reminder_to_vote(self).deliver_now
  end
end
