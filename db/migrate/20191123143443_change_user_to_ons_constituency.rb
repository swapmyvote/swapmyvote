require_relative "../fixtures/ons_constituency_lookup"

class ChangeUserToOnsConstituency < ActiveRecord::Migration[5.2]
  def up
    cons_id_to_ons_lookup = OnsConstituencyLookup.new

    User.all.each do |user|
      next if user.constituency_id.nil?

      puts "Looking up ONS id for #{user.name}'s constituency #{user.constituency_id} ..."
      ons_id = cons_id_to_ons_lookup.find_by(id: user.constituency_id)
      puts "   found ONS id #{ons_id}"
      user.update!(constituency_ons_id: ons_id) unless ons_id.nil?
      puts "   set ONS id to #{ons_id}"
    end
    rename_column :users, :constituency_id, :old_constituency_id
  end

  def down
    rename_column :users, :old_constituency_id, :constituency_id
  end
end
