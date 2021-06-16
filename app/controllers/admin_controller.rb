class AdminController < ApplicationController
  if ENV["ADMIN_PASSWORD"].blank?
    raise "You didn't set ADMIN_PASSWORD!"
  end

  http_basic_authenticate_with name: "swapmyvote",
                               password: ENV["ADMIN_PASSWORD"] || "secret"

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

  private

  def change_mobile_verification(mode, phone)
    phone.verified = mode == "verify"
    phone.save!
    @successful_action = phone.verified ? "verified" : "de-verified"
  end
end
