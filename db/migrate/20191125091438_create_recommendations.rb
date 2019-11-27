class CreateRecommendations < ActiveRecord::Migration[5.2]
  def change
    create_table :recommendations do |t|
      t.string :text
      t.string :link
      t.string :site, null: false
      t.string :constituency_ons_id, null: false

      t.timestamps

      t.index [:site, :constituency_ons_id], unique: true
    end
  end
end
