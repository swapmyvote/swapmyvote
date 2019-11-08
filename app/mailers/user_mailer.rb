# frozen_string_literal: true

class UserMailer < ApplicationMailer
  default from: 'Swap My Vote <hello@swapmyvote.uk>'

  def welcome_email(user)
    @user = user
    mail(to: @user.email, subject: 'Welcome to Swap My Vote')
  end

  def confirm_swap(user, swap_with)
    @user = user
    @swap_with = swap_with
    mail(to: @user.email, subject: "#{swap_with.name} would like to swap their vote with you!")
  end

  def swap_confirmed(user, swap_with)
    @user = user
    @swap_with = swap_with
    mail(to: @user.email, subject: "Swapping your vote with #{swap_with.name} is confirmed!")
  end

  def swap_cancelled(user, swap_with)
    @user = user
    @swap_with = swap_with
    mail(to: @user.email, subject: "Your swapped vote with #{swap_with.name} has been cancelled.")
  end

  def not_swapped_follow_up(user)
    @user = user
    mail(to: @user.email, subject: 'Your vote swap preference is in demand!')
  end

  def partner_has_voted(user)
    @user = user
    mail(to: @user.email, subject: "#{@user.swapped_with.name} has voted for you!")
  end

  def reminder_to_vote(user)
    @user = user
    mail(to: @user.email, subject: "Remember to vote #{@user.willing_party.name} today!")
  end

  def no_swap(user)
    @user = user
    mail(to: @user.email, subject: "Sorry, we couldn't find you a vote swap")
  end

  def swap_not_confirmed(user)
    @user = user
    mail(to: @user.email, subject: "Sorry, we couldn't find you a confirmed vote swap")
  end
end
