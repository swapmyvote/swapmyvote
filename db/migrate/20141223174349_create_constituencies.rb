class CreateConstituencies < ActiveRecord::Migration
  def change
    create_table :constituencies do |t|
      t.string :name

      t.timestamps null: false
    end
    
    Constituency.create name: "Exeter"
    Constituency.create name: "Glasgow"
    Constituency.create name: "Edinburgh"
  end
end
