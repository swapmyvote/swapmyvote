namespace :swaps do
	desc "Print a CSV of confirmed swaps"
	task :csv => :environment do
		ActiveRecord::Base.logger = nil
		Swap.where(confirmed: true).each {|s|
			print "#{s.choosing_user.try(:name)},#{s.choosing_user.try(:email)},#{s.choosing_user.try(:constituency).try(:name)},#{s.id}\n"
			print "#{s.chosen_user.try(:name)},#{s.chosen_user.try(:email)},#{s.chosen_user.try(:constituency).try(:name)},#{s.id}\n"
		}
	end
	
	desc "Cancel swaps which are older than 2 days"
	task :cancel_old => :environment do
		swaps = Swap.where({confirmed: false}).where(['created_at < ?', DateTime.now - 2.days])
		print "Cancelling #{swaps.length} unconfirmed swaps\n"
		swaps.each {|s| s.destroy}
	end
end