namespace :users do
  desc "Send vote reminder emails to everyone"
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
