# frozen_string_literal: true

class AddUsersHasVotedColumn < ActiveRecord::Migration[4.2]
  def change
    add_column :users, :has_voted, :boolean, default: false
  end
end
