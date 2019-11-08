# frozen_string_literal: true

namespace :users do
  desc 'Send vote reminder emails to everyone'
  task send_vote_reminder_emails: :environment do
    Swap.where(confirmed: true).each do |swap|
      begin
        swap.chosen_user.send_vote_reminder_email
      rescue StandardError => e
        print 'Failed to send vote reminder'
      end
      begin
        swap.choosing_user.send_vote_reminder_email
      rescue StandardError => e
        print 'Failed to send vote reminder'
      end
    end
  end
end
