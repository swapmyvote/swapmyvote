class AddVotedEmailSentColumn < ActiveRecord::Migration
  def change
    add_column :users, :sent_vote_reminder_email, :boolean, default: false
  end
end
