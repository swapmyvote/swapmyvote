require_relative "../fixtures/ons_constituency_lookup"

class ChangePollToOnsConstituency < ActiveRecord::Migration[5.2]
  def up
    cons_id_to_ons_lookup = OnsConstituencyLookup.new

    Poll.all.each do |poll|
      unless poll.constituency_id.nil?
        ons_id = cons_id_to_ons_lookup.find_by(id: poll.constituency_id)
        poll.update!(constituency_ons_id: ons_id) unless ons_id.nil?
      end
    end
    rename_column :polls, :constituency_id, :old_constituency_id
  end

  def down
    rename_column :polls, :old_constituency_id, :constituency_id
  end
end
