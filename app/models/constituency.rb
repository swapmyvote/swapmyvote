class Constituency < ApplicationRecord
  has_many :polls, dependent: :destroy
end
