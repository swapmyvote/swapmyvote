class Swap < ActiveRecord::Base
  belongs_to :chosen_user, class_name: "User"
  has_one    :choosing_user, class_name: "User"
  
  before_destroy :notify_users_of_cancelled_swap
  def notify_users_of_cancelled_swap
    UserMailer.swap_cancelled(self.choosing_user, self.chosen_user).deliver_now
    UserMailer.swap_cancelled(self.chosen_user, self.choosing_user).deliver_now
  end
end
