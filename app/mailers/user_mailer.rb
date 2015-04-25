class UserMailer < ApplicationMailer
	default from: 'Swap My Vote <hello@swapmyvote.uk>'
	
	def welcome_email(user)
		@user = user
		mail(to: @user.email, subject: 'Welcome to Swap My Vote')
	end
	
	def confirm_swap(user, swap_with)
		@user = user
		@swap_with = swap_with
		mail(to: @user.email, subject: "#{swap_with.name} would like to swap their vote with you!")
	end
	
	def swap_confirmed(user, swap_with)
		@user = user
		@swap_with = swap_with
		mail(to: @user.email, subject: "Swapping your vote with #{swap_with.name} is confirmed!")
	end
	
	def swap_cancelled(user, swap_with)
		@user = user
		@swap_with = swap_with
		mail(to: @user.email, subject: "Your swapped vote with #{swap_with.name} has been cancelled.")
	end
	
	def not_swapped_follow_up(user)
		@user = user
		mail(to: @user.email, subject: "Your vote swap preference is in demand!")
	end
end
