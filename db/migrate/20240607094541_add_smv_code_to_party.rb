class AddSmvCodeToParty < ActiveRecord::Migration[5.2]
  def up
    add_column :parties, :smv_code, :string
  end

  def down
    remove_column :parties, :smv_code, :string
  end
end
