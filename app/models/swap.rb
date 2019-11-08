# frozen_string_literal: true

class Swap < ApplicationRecord
  belongs_to :chosen_user, class_name: "User"
  has_one    :choosing_user, class_name: "User"

  before_destroy :notify_users_of_cancelled_swap
  def notify_users_of_cancelled_swap
    UserMailer.swap_cancelled(choosing_user, chosen_user).deliver_now
    UserMailer.swap_cancelled(chosen_user, choosing_user).deliver_now
  end
end
