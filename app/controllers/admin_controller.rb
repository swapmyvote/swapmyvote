class AdminController < ApplicationController
  if ENV["ADMIN_PASSWORD"].blank?
    raise "You didn't set ADMIN_PASSWORD!"
  end

  # before_action :require_login, only: [:send_email_proofs]

  http_basic_authenticate_with name: "swapmyvote",
                               password: ENV["ADMIN_PASSWORD"] || "secret"

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

  def send_email_proofs
    if current_user.nil?
      flash[:errors] = ["You need to be logged on so we have an email address to send to"]
      redirect_to root_path
    else
      flash[:warnings] = ["I would have sent an email if I was finished code"]

      # def send_welcome_email
      #   return if email.blank?
      #   logger.debug "Sending Welcome email"
      #   UserMailer.welcome_email(self).deliver_now
      #   sent_emails.create!(template: SentEmail::WELCOME)
      # end

      logger.debug "Sending Welcome email to #{current_user}"
      UserMailer.welcome_email(current_user).deliver_now
      redirect_to user_path
    end
  end

  private

  def change_mobile_verification(mode, phone)
    phone.verified = mode == "verify"
    phone.save!
    @successful_action = phone.verified ? "verified" : "de-verified"
  end
end
