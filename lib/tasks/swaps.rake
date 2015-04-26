namespace :swaps do
	desc "Print a CSV of confirmed swaps"
	task :csv => :environment do
		ActiveRecord::Base.logger = nil
		Swap.where(confirmed: true).each {|s|
			print "#{s.choosing_user.try(:name)},#{s.choosing_user.try(:email)},#{s.choosing_user.try(:constituency).try(:name)},#{s.id}\n"
			print "#{s.chosen_user.try(:name)},#{s.chosen_user.try(:email)},#{s.chosen_user.try(:constituency).try(:name)},#{s.id}\n"
		}
	end
end