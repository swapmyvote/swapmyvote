class CreateParties < ActiveRecord::Migration
  def change
    create_table :parties do |t|
      t.string :name

      t.timestamps null: false
    end
    
    Party.create name: "Greens"
    Party.create name: "UKIP"
    Party.create name: "Lib Dems"
    Party.create name: "Labour"
    Party.create name: "Conservatives"
  end
end
