class Poll < ApplicationRecord
  belongs_to :constituency,
             class_name: "OnsConstituency",
             foreign_key: "constituency_ons_id",
             primary_key: "ons_id",
             inverse_of: "polls",
             optional: true
  belongs_to :party
end
