class Recommendation < ApplicationRecord
  belongs_to :constituency,
             class_name: "OnsConstituency",
             primary_key: "ons_id",
             foreign_key: "constituency_ons_id"
end
