class AddOnsIdToPolls < ActiveRecord::Migration[5.2]
  def change
    add_column :polls, :constituency_ons_id, :string
  end
end
