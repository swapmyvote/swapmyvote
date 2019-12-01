class OnsConstituency < ApplicationRecord
  NUMBER_OF_UK_CONSTITUENCIES = 650
  has_many :polls,
           foreign_key: "constituency_ons_id",
           primary_key: "ons_id"
  has_many :recommendations,
           primary_key: "ons_id",
           foreign_key: "constituency_ons_id"
end
