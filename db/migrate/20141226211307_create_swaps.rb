# frozen_string_literal: true

class CreateSwaps < ActiveRecord::Migration[4.2]
  def change
    create_table :swaps do |t|
      t.integer :chosen_user_id
      t.boolean :confirmed

      t.timestamps null: false
    end
  end
end
