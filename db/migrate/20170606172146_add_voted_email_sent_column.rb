# frozen_string_literal: true

class AddVotedEmailSentColumn < ActiveRecord::Migration[4.2]
  def change
    add_column :users, :sent_vote_reminder_email, :boolean, default: false
  end
end
