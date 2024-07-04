class SentEmail < ApplicationRecord
  belongs_to :user

  WELCOME = :welcome_email
  REMINDER_GET_SWAPPING = :reminder_get_swapping
end
