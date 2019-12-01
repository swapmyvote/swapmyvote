class CreateIdentities < ActiveRecord::Migration[5.2]
  def change
    create_table :identities do |t|
      t.references :user, foreign_key: true
      t.integer :provider
      t.string :name
      t.string :uid
      t.string :image_url
      t.string :email

      t.timestamps null: false
    end
  end
end
