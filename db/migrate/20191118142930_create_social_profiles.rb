class CreateSocialProfiles < ActiveRecord::Migration[5.2]
  def change
    create_table :users_social_profiles do |t|
      t.references :user, foreign_key: true
      t.integer :provider
      t.string :nickname
      t.string :uid

      t.timestamps null: false
    end
  end
end
