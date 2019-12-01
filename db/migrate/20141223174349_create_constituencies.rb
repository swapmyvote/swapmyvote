class CreateConstituencies < ActiveRecord::Migration[4.2]
  def change
    create_table :constituencies do |t|
      t.string :name

      t.timestamps null: false
    end
  end
end
