class AddSwapsPausedToUser < ActiveRecord::Migration[5.2]
  def change
    add_column :users, :swaps_paused, :boolean, default: false
  end
end
