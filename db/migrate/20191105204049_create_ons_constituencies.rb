# frozen_string_literal: true

class CreateOnsConstituencies < ActiveRecord::Migration[5.2]
  def change
    create_table :ons_constituencies do |t|
      t.string :ons_id, null: false
      t.string :name, null: false

      t.timestamps
    end
    add_index :ons_constituencies, :ons_id, unique: true
  end
end
