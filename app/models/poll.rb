class Poll < ActiveRecord::Base
  belongs_to :constituency
  belongs_to :party
end
