require_relative "../helpers/swaps_helper"

class Swap < ApplicationRecord
  belongs_to :chosen_user, class_name: "User"
  has_one    :choosing_user, class_name: "User"

  before_destroy :notify_users_of_cancelled_swap
  def notify_users_of_cancelled_swap
    UserMailer.swap_cancelled(choosing_user, chosen_user).deliver_now
    UserMailer.swap_cancelled(chosen_user, choosing_user).deliver_now
  end

  class << self
    include SwapsHelper
    def cancel_old
      destroyed_ids = []

      swaps = Swap.where({ confirmed: false }).where(["created_at < ?", DateTime.now - swap_validity_hours.hours])
      if swaps.count.zero?
        puts "No unconfirmed swaps meet deletion criteria - before #{DateTime.now - swap_validity_hours.hours}"
      else
        puts "Cancelling #{swaps.length} unconfirmed swaps\n"
        swaps.each do |swap|
          swap.destroy
          destroyed_ids << swap.id
        rescue => e
          puts "Failed to cancel swap #{swap.id} because #{e}"
        end
      end
      return destroyed_ids
    end
  end
end
