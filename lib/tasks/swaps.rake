namespace :swaps do
	desc "Print a CSV of confirmed swaps"
	task :csv => :environment do
		ActiveRecord::Base.logger = nil
		print "Name,Email,Constituency,Will Vote For,Swap ID\n"
		Swap.where(confirmed: true).each {|s|
			print "#{s.choosing_user.try(:name)},#{s.choosing_user.try(:email)},#{s.choosing_user.try(:constituency).try(:name)},#{s.choosing_user.try(:willing_party).try(:name)},#{s.created_at},#{s.id}\n"
			print "#{s.chosen_user.try(:name)},#{s.chosen_user.try(:email)},#{s.chosen_user.try(:constituency).try(:name)},#{s.chosen.try(:willing_party).try(:name)},#{s.created_at},#{s.id}\n"
		}
	end
	
	desc "Cancel swaps which are older than 24 hours"
	task :cancel_old => :environment do
		swaps = Swap.where({confirmed: false}).where(['created_at < ?', DateTime.now - 1.days])
		print "Cancelling #{swaps.length} unconfirmed swaps\n"
		for swap in swaps
			begin
				swap.destroy
			rescue => e
				print "Failed to cancel swap #{swap.id}"
			end
		end
	end
end