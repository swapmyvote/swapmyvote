class OnsConstituency < ApplicationRecord
  NUMBER_OF_UK_CONSTITUENCIES = 650
  has_many :polls,
           foreign_key: "constituency_ons_id",
           primary_key: "ons_id",
           dependent: :destroy

  has_many :recommendations,
           primary_key: "ons_id",
           foreign_key: "constituency_ons_id",
           dependent: :destroy

  has_many :recommended_parties,
           inverse_of: :constituency,
           primary_key: "ons_id",
           foreign_key: "constituency_ons_id",
           dependent: :destroy

  def parties_by_marginal_score
    polls.order(:marginal_score).map(&:party)
  end
end
