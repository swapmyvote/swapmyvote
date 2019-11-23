require_relative "../fixtures/ons_constituency_lookup"

class ChangeUserToOnsConstituency < ActiveRecord::Migration[5.2]
  def up
    cons_id_to_ons_lookup = OnsConstituencyLookup.new

    User.all.each do |user|
      unless user.constituency_id.nil?
        ons_id = cons_id_to_ons_lookup.find_by_id(user.constituency_id)
        user.update!(constituency_ons_id: ons_id) unless ons_id.nil?
      end
    end
    rename_column :users, :constituency_id, :old_constituency_id
  end

  def down
    rename_column :users, :old_constituency_id, :constituency_id
  end
end
