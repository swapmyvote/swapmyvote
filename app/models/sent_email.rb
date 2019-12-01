class SentEmail < ApplicationRecord
  belongs_to :user
  WELCOME = :welcome_email
end
