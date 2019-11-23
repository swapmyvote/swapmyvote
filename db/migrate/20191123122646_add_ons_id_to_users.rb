class AddOnsIdToUsers < ActiveRecord::Migration[5.2]
  def change
    add_column :users, :constituency_ons_id, :string
  end
end
