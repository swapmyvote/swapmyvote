class SentEmail < ApplicationRecord
  belongs_to :user

  WELCOME = :welcome_email
  REMINDER_GET_SWAPPING = :reminder_get_swapping
  REMINDER_PENDING_OFFER = :reminder_pending_offer
  REMINDER_VOTE = :reminder_vote
end
