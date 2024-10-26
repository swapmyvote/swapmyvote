class UserMailerPreview < ActionMailer::Preview
  def welcome_email
    UserMailer.welcome_email(user_one)
  end

  def confirm_swap
    UserMailer.confirm_swap(user_one, user_two)
  end

  def email_address_shared
    UserMailer.email_address_shared(user_one, user_two)
  end

  def swap_confirmed
    UserMailer.swap_confirmed(user_one, user_two, true)
  end

  def swap_confirmed
    UserMailer.swap_confirmed(user_one, user_two, false)
  end

  def swap_cancelled
    UserMailer.swap_cancelled(user_one, user_two)
  end

  def not_swapped_follow_up
    UserMailer.not_swapped_follow_up(user_one)
  end

  def partner_has_voted
    UserMailer.partner_has_voted(user_one)
  end

  def reminder_to_get_swapping
    UserMailer.reminder_to_get_swapping(user_one)
  end

  def reminder_to_accept_swap
    UserMailer.reminder_to_accept_swap(user_one, user_two)
  end

  def reminder_to_vote
    UserMailer.reminder_to_vote(user_one)
  end

  def no_swap
    UserMailer.no_swap(user_one)
  end

  def swap_not_confirmed
    UserMailer.swap_not_confirmed(user_one)
  end

  private

  def user_one
    u = User.first
    u.create_outgoing_swap(
      chosen_user: user_two,
      confirmed: false,
      consent_share_email_chooser: true
    )
    u
  end

  def user_two
    u = User.second
    u.destroy_all_potential_swaps
    u
  end

  # def require_admin_login
  #   if user_one.nil?
  #     flash[:errors] = ["You need to be logged on so we have an email address to send to"]
  #     redirect_to root_path
  #   end
  # end
end
