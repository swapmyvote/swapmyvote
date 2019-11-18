class UsersSocialProfile < ApplicationRecord
  belongs_to :user

  enum provider: %i[
    :twitter
    :facebook
  ]

end

