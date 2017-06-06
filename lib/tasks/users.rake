namespace :users do
	desc "Send vote reminder emails to everyone"
	task :send_vote_reminder_emails => :environment do
		for swap in Swap.where(confirmed: true)
			swap.chosen_user.send_vote_reminder_email
			swap.choosing_user.send_vote_reminder_email
		end
	end
end