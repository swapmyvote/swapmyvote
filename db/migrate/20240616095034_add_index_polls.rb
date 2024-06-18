class AddIndexPolls < ActiveRecord::Migration[5.2]
  def change
    add_index(:polls, [:constituency_ons_id, :party_id], unique: true)
  end
end
