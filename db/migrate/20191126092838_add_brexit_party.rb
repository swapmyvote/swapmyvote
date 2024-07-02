class AddBrexitParty < ActiveRecord::Migration[5.2]
  def up_disabled
    Party.find_or_create_by(name: "Brexit Party", color: "#5bc0de")
  end

  def down
    bxp = Party.find_by(name: "Brexit Party")
    bxp.destroy unless bxp.nil?
  end
end
