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

    def old_swaps
      Swap
        .where({ confirmed: false })
        .where(["created_at < ?", DateTime.now - swap_validity_hours.hours])
    end

    def show_old
      old = old_swaps
      old.each do |swap|
        p swap
      end
      puts "Total swaps to expire: #{old.count}"
    end

    def cancel_old
      destroyed_ids = []

      swaps = old_swaps
      if swaps.count.zero?
        logger.info "No unconfirmed swaps meet deletion criteria - before #{DateTime.now - swap_validity_hours.hours}"
      else
        logger.debug "Cancelling #{swaps.length} unconfirmed swaps\n"
        swaps.each do |swap|
          swap.destroy
          destroyed_ids << swap.id
        rescue => e
          logger.error "Failed to cancel swap #{swap.id} because #{e}"
        end
      end
      return destroyed_ids
    end
  end
end
