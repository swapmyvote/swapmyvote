class CreateOnsConstituencies < ActiveRecord::Migration[5.2]
  def change
    create_table :ons_constituencies do |t|
      t.string :ons_id
      t.string :name

      t.timestamps
    end
    add_index :ons_constituencies, :ons_id, unique: true
  end
end
