class AdminController < ApplicationController
  # before_action :require_login, only: [:send_email_proofs]

  def self.admin_user
    "swapmyvote"
  end

  def self.admin_password
    ENV["ADMIN_PASSWORD"] || "secret"
  end

  http_basic_authenticate_with name: admin_user, password: admin_password

  def index
  end

  def stats
    @user_count = User.count
    @swap_count = Swap.count
    @unconfirmed_swap_count = Swap.where(confirmed: false).count
    @confirmed_swap_count = Swap.where(confirmed: true).count
    @parties = Party.all
    @swaps_matrix = []
    @parties.each do |preferred_party|
      row = []
      @swaps_matrix.push row
      @parties.each do |willing_party|
        count = User.where(willing_party: willing_party, preferred_party: preferred_party).count
        row.push count
      end
    end
  end

  def verify_mobile
    num = params.dig(:mobile_phone, :full)
    return unless num

    phone = MobilePhone.find_by(number: num)
    unless phone
      flash.now[:errors] = ["Couldn't find a user with the number #{num}"]
      return
    end

    mode = params[:mode]
    if mode == "verify" && phone.verified
      flash.now[:errors] = ["The number #{num} was already verified!"]
    elsif mode == "deverify" && !phone.verified
      flash.now[:errors] = ["The number #{num} wasn't verified!"]
    else
      change_mobile_verification(mode, phone)
    end
  end

  # rubocop:disable Metrics/MethodLength
  def send_email_proofs
    if current_user.nil?
      flash[:errors] = ["You need to be logged on so we have an email address to send to"]
      redirect_to root_path
    else
      logger.debug "Sending proof-reading emails to #{current_user}"

      UserMailer.welcome_email(current_user).deliver_now

      other_user = User.first
      other_user.destroy_all_potential_swaps
      current_user.create_outgoing_swap(
        chosen_user: other_user,
        confirmed: false,
        consent_share_email_chooser: true
      )

      UserMailer.confirm_swap(current_user, other_user).deliver_now
      UserMailer.email_address_shared(current_user, other_user).deliver_now

      UserMailer.swap_confirmed(current_user, other_user, true).deliver_now
      UserMailer.swap_confirmed(current_user, other_user, false).deliver_now

      UserMailer.swap_cancelled(current_user, other_user).deliver_now

      UserMailer.not_swapped_follow_up(current_user).deliver_now
      UserMailer.partner_has_voted(current_user).deliver_now
      UserMailer.reminder_to_get_swapping(current_user).deliver_now
      UserMailer.reminder_to_accept_swap(current_user, other_user).deliver_now
      UserMailer.reminder_to_vote(current_user).deliver_now
      UserMailer.no_swap(current_user).deliver_now
      UserMailer.swap_not_confirmed(current_user).deliver_now

      # flash[:info] = ["Mails have been sent"]

      redirect_to admin_path
    end
  end

  private

  def change_mobile_verification(mode, phone)
    phone.verified = mode == "verify"
    phone.save!
    @successful_action = phone.verified ? "verified" : "de-verified"
  end
end
