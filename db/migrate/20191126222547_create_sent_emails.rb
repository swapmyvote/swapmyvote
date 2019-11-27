class CreateSentEmails < ActiveRecord::Migration[5.2]
  def change
    create_table :sent_emails do |t|
      t.references :user, foreign_key: true
      t.string :template

      t.timestamps
    end
  end
end
