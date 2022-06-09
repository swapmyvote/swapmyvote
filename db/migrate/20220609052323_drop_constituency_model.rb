class DropConstituencyModel < ActiveRecord::Migration[5.2]
  def up
    drop_table :constituencies
  end
end
