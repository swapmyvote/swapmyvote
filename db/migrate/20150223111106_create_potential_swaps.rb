class CreatePotentialSwaps < ActiveRecord::Migration
  def change
    create_table :potential_swaps do |t|
      t.integer :source_user_id
      t.integer :target_user_id

      t.timestamps null: false
    end
  end
end
