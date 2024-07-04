namespace :users do
  desc "Send reminder emails to everyone without any swap"
  task :send_get_swapping_reminder_emails, [:dry_run] => :environment do |t, args|
    args.with_defaults(dry_run: false)

    for user in User.left_outer_joins(:incoming_swap).where(swap_id: nil, "swaps.chosen_user_id": nil)
      can_receive = user.can_receive_email?("get swapping")
      if args[:dry_run]
        if can_receive
          puts "Would send to #{user.name_and_email}"
        end
        next
      end

      begin
        if can_receive
          puts user.name_and_email
        end
        user.send_get_swapping_reminder_email
      rescue => e
        puts "Failed to send get swapping reminder to #{user.name}"
      end
    end
  end

  desc "Send vote reminder emails to everyone with a confirmed swap"
  task send_vote_reminder_emails: :environment do
    for swap in Swap.where(confirmed: true)
      begin
        swap.chosen_user.send_vote_reminder_email
      rescue => e
        puts "Failed to send vote reminder"
      end
      begin
        swap.choosing_user.send_vote_reminder_email
      rescue => e
        puts "Failed to send vote reminder"
      end
    end
  end
end
