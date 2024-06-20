class User < ApplicationRecord
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable, :omniauthable,
         omniauth_providers: [:twitter, :facebook]
  belongs_to :preferred_party, class_name: "Party", optional: true
  belongs_to :willing_party, class_name: "Party", optional: true

  validates_with DistinctPartiesValidator

  has_one    :mobile_phone, dependent: :destroy
  belongs_to :constituency,
             class_name: "OnsConstituency",
             foreign_key: "constituency_ons_id",
             primary_key: "ons_id",
             optional: true

  belongs_to :outgoing_swap, class_name: "Swap", foreign_key: "swap_id",
             dependent: :destroy, optional: true
  has_one    :incoming_swap, class_name: "Swap", foreign_key: "chosen_user_id",
             dependent: :destroy
  has_one   :identity, dependent: :destroy

  has_many :potential_swaps, foreign_key: "source_user_id", dependent: :destroy
  has_many :incoming_potential_swaps, class_name: "PotentialSwap", foreign_key: "target_user_id", dependent: :destroy
  has_many :sent_emails, dependent: :destroy

  before_save :clear_swap, if: :details_changed?
  before_destroy :clear_swap
  after_save :send_welcome_email, if: :needs_welcome_email?

  # Additional validation for emails, :validatable has already added basic validation
  validate :email_uniqueness, on: :create

  validates :name, presence: true

  include UsersHelper
  include ::UserErrorsConcern

  def omniauth_tokens(auth)
    self.token = auth.credentials.token
    if auth.credentials.expires_at
      self.expires_at = Time.zone.at(auth.credentials.expires_at)
    end
    save!
  end

  def willing_party_poll
    constituency.polls.find_by(party_id: willing_party_id)
  end

  def potential_swap_users(number = 5)
    # Clear out swaps every while to keep the list fresh for people checking back
    potential_swaps
      .where(["created_at < ?",
              DateTime.now - potential_swap_expiry_mins.minutes])
      .destroy_all
    create_potential_swaps(number)
    swaps = potential_swaps.all.eager_load(
      target_user: [ :identity, { constituency: [{ polls: :party }] } ]
    )
    return swaps
      .sort_by { |s| s.target_user.willing_party_poll&.marginal_score || 999_999 }
      .map {|s| s.target_user}
  end

  class ChooseSwapType
    def initialize
      @even_odd = 0
    end

    def swap
      @even_odd += 1
      return @even_odd.odd? ? :marginal : :random
    end
  end

  class SwapTrier
    def initialize(method, max_attempts)
      @method = method
      @count = max_attempts
    end

    def try
      return if finished?
      @count -= 1
      return @method.call
    end

    def finished?
      @count <= 0
    end
  end

  def create_potential_swaps(number = 5)
    chooser = ChooseSwapType.new
    marginal_trier = SwapTrier.new(method(:try_to_create_marginal_swap), number * 2)
    random_trier = SwapTrier.new(method(:try_to_create_potential_swap), number * 2)

    while potential_swaps.reload.count < number
      if chooser.swap == :marginal
        marginal_trier.try unless marginal_trier.finished?
      else
        random_trier.try unless random_trier.finished?
      end
      break if random_trier.finished? && marginal_trier.finished?
    end
  end

  def try_to_create_potential_swap
    swaps = complementary_voters.where("constituency_ons_id like '_%'")
    return one_swap_from_possible_users(swaps)
  end

  def try_to_create_marginal_swap
    swaps = complementary_voters.where(
      { constituency_ons_id: marginal_polls.map(&:constituency_ons_id) }
    )
    return one_swap_from_possible_users(swaps)
  end

  private def complementary_voters
    user_ids_already_in_potential_swaps = potential_swaps.reload.map(&:target_user_id)
    user_ids_we_dont_want = user_ids_already_in_potential_swaps + [id]
    User
      .left_joins(:incoming_swap, :outgoing_swap)
      .where(
        preferred_party_id: willing_party_id,
        willing_party_id: preferred_party_id
      )
      .where("users.email like '_%'") # We need emails to send confirmation emails
      .where("swaps.chosen_user_id IS ?", nil) # not in an incoming swap
      .where("outgoing_swaps_users.id IS ?", nil) # not in an outgoing swap
      .where.not(users: { id: user_ids_we_dont_want }) # Ignore if already included in potential swaps, or if me
      .where.not(users: { constituency_ons_id: constituency_ons_id }) # Ignore if my constituency
  end

  private def one_swap_from_possible_users(user_query)
    offset = rand(user_query.count)
    target_user = user_query.offset(offset).take
    return nil unless target_user
    return potential_swaps.create(target_user: target_user)
  end

  def marginal_polls
    Poll.where(["marginal_score < ?", 1000]).where(party: preferred_party)
  end

  def marginal_constituencies
    OnsConstituency.where({ ons_id: marginal_polls.map(&:constituency_ons_id) })
  end

  def destroy_all_potential_swaps
    PotentialSwap.destroy(potential_swaps.pluck(:id))
    PotentialSwap.destroy(incoming_potential_swaps.pluck(:id))
  end

  # This allows mocking in tests
  def mobile_phone_verified?
    mobile_phone&.verified
  end

  def swap_with_user_id(user_id, consent_share_email) # test this
    other_user = User.find(user_id)
    return unless can_swap_with?(other_user)
    return unless swap_consent_given?(consent_share_email)

    destroy_all_potential_swaps
    other_user.destroy_all_potential_swaps

    UserMailer.confirm_swap(other_user, self).deliver_now

    create_outgoing_swap(
      chosen_user: other_user,
      confirmed: false,
      consent_share_email_chooser: (consent_share_email || false)
    )
    save
  end

  def swap_consent_given?(consent)
    unless consent
      errors.add :base,
                 "You and your vote swap partner need to be able to contact " +
                 "each other by email so you can establish trust between you. (See the FAQ)"
      return false
    end
    return true
  end

  private def can_swap_with?(other_user)
    if outgoing_swap || incoming_swap
      errors.add :base, "Choosing user is already swapped"
      return false
    elsif other_user.outgoing_swap || other_user.incoming_swap
      errors.add :base, "Chosen user is already swapped"
      return false
    elsif other_user.email.blank?
      errors.add :base,
                 "Chosen user has no email address; please choose another user."
      return false
    end

    return true
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

  def confirm_swap(swap_params)
    return unless incoming_swap
    incoming_swap.update(swap_params)
    UserMailer.swap_confirmed(self, swapped_with, incoming_swap.consent_share_email_chooser).deliver_now
    UserMailer.swap_confirmed(swapped_with, self, incoming_swap.consent_share_email_chosen).deliver_now
  end

  def consented_to_share_email?
    # Check if user has given permission for swap partner to see their email
    return outgoing_swap.consent_share_email_chooser if outgoing_swap
    return incoming_swap.consent_share_email_chosen if incoming_swap
    return false
  end

  def update_swap(swap_params)
    if incoming_swap
      consent_given = swap_params[:consent_share_email_chosen] || swap_params[:consent_share_email]
      if consent_given
        incoming_swap.update!(consent_share_email_chosen: true)
        UserMailer.email_address_shared(swapped_with, self).deliver_now if swap_confirmed?
      end
    end
    # rubocop:disable Style/GuardClause
    if outgoing_swap
      consent_given = swap_params[:consent_share_email_chooser] || swap_params[:consent_share_email]
      if consent_given
        outgoing_swap.update!(consent_share_email_chooser: true)
        UserMailer.email_address_shared(swapped_with, self).deliver_now if swap_confirmed?
      end
    end
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
    preferred_party_id_changed? || willing_party_id_changed? || constituency_ons_id_changed?
  end

  def send_welcome_email
    return if email.blank?
    logger.debug "Sending Welcome email"
    UserMailer.welcome_email(self).deliver_now
    sent_emails.create!(template: SentEmail::WELCOME)
  end

  def needs_welcome_email?
    !email.blank? && sent_emails.where(template: SentEmail::WELCOME).none?
  end

  def send_vote_reminder_email
    return if sent_vote_reminder_email
    self.sent_vote_reminder_email = true
    save
    UserMailer.reminder_to_vote(self).deliver_now
  end

  def name
    self[:name].try { |n| n + test_user_suffix }
  end

  def redacted_name
    NameRedactor.redact(self[:name]) + test_user_suffix
  end

  def mobile_number
    mobile_phone.try(:number)
  end

  def mobile_number=(new_number)
    User.transaction do
      unless mobile_phone.nil?
        mobile_phone.destroy
      end
      create_mobile_phone!(number: new_number)
    end
  end

  # This is used to determine whether to enforce the requirement for
  # mobile verification.
  def mobile_verification_missing?
    return false if test_user_validation_bypassed?
    return !mobile_phone_verified?
  end

  def test_user_validation_bypassed?
    test_user? && ENV["TEST_USERS_SKIP_MOBILE_VERIFICATION"]
  end

  def image_url
    identity&.image_url&.gsub("http://", "//") || gravatar_image_url
  end

  def gravatar_image_url
    hash = Digest::MD5.hexdigest(email.downcase)
    return "https://secure.gravatar.com/avatar/#{hash}?d=identicon&s=80"
  end

  def social_profile?
    identity.present?
  end

  def email_login?
    !social_profile?
  end

  def facebook_login?
    identity&.provider == "facebook"
  end

  def profile_url
    identity&.profile_url
  end

  def email_url
    "mailto:#{CGI.escape email}"
  end

  def provider
    identity&.provider
  end

  def uid
    identity&.uid
  end

  def test_user?
    email.present? && email =~ /@(example\.com|tfbnw\.net)$/
  end

  def test_user_suffix
    test_user? ? " (test user)" : ""
  end

  protected

  def password_required?
    return false if test_user_validation_bypassed?
    # otherwise devise should be able to figure this out ?
    # but just in case we need to revisit and override, leave this function here
    super
  end

  def email_uniqueness
    # Ignore nil email addresses
    return unless email

    existing_user = find_existing_email(email)
    return unless existing_user

    email_uniqueness_errors(existing_user)
  end

  def find_existing_email(email)
    if id
      # Ignore self in the uniqueness check
      User.find_by("lower(#{:email}) = ? and id <> ?", email.downcase, id)
    else
      User.find_by("lower(#{:email}) = ?", email.downcase)
    end
  end
end
