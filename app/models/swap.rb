class Swap < ActiveRecord::Base
  belongs_to :chosen_user, class_name: "User"
  has_one    :choosing_user, class_name: "User"
end
