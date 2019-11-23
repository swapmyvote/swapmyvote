class MobilePhone < ApplicationRecord
  belongs_to :user
  validates :number, uniqueness: true
end
