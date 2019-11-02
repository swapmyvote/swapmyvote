class Poll < ApplicationRecord
  belongs_to :constituency
  belongs_to :party
end
