class AddSmvCodeToParty < ActiveRecord::Migration[5.2]
  def up
    add_column :parties, :smv_code, :string

    party_codes_by_name = Party.master_list.each_with_object({}) do |party, lookup|
      lookup[party[:name]] = party[:smv_code]
    end

    # For anything already in the DB lookup the code
    Party.all.each do |party|
      party.smv_code = party_codes_by_name[party.name]
      raise ArgumentError, "No matching smv_code for party #{party.inspect}" if party.smv_code.nil?
      party.save!
    end
  end

  def down
    remove_column :parties, :smv_code, :string
  end
end
