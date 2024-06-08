class CreateRecommendedParties < ActiveRecord::Migration[5.2]
  def change
    create_table :recommended_parties do |t|
      t.string :text
      t.string :link
      t.string :site, null: false
      t.string :constituency_ons_id, null: false
      t.references :party, foreign_key: true, null: false

      t.index [:constituency_ons_id, :party_id, :site],
              unique: true,
              name: "index_recommended_parties_on_site_and_constituency_and_party"

      t.timestamps
    end
  end
end
