# frozen_string_literal: true

class CreatePotentialSwaps < ActiveRecord::Migration[4.2]
  def change
    create_table :potential_swaps do |t|
      t.integer :source_user_id
      t.integer :target_user_id

      t.timestamps null: false
    end
  end
end
