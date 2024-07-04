namespace :users do
  desc "Send reminder emails to everyone without any swap"
  task send_get_swapping_reminder_emails: :environment do
    for user in User.left_outer_joins(:incoming_swap).where(swap_id: nil, "swaps.chosen_user_id": nil)
      begin
        user.send_get_swapping_reminder_email
      rescue => e
        print "Failed to send vote reminder"
      end
    end
  end

  desc "Send vote reminder emails to everyone with a confirmed swap"
  task send_vote_reminder_emails: :environment do
    for swap in Swap.where(confirmed: true)
      begin
        swap.chosen_user.send_vote_reminder_email
      rescue => e
        print "Failed to send vote reminder"
      end
      begin
        swap.choosing_user.send_vote_reminder_email
      rescue => e
        print "Failed to send vote reminder"
      end
    end
  end
end
