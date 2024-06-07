class RecommendedParty < ApplicationRecord
  belongs_to :ons_constituency
  belongs_to :party
end
