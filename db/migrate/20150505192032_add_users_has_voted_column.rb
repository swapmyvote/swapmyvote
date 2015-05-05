class AddUsersHasVotedColumn < ActiveRecord::Migration
  def change
    add_column :users, :has_voted, :boolean, default: false
  end
end
