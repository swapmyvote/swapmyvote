class AddIndexRecommendedParty < ActiveRecord::Migration[5.2]
  def up
    remove_index(:recommended_parties, name: :index_recommended_parties_on_site_and_constituency_and_party)

    # Putting constituency/site first helps queries that are only on
    # constituency and site; no need for another index optimised for
    # database seeding. If this doesn't work for the website, consider
    # adding an index rather than changing this one.
    add_index(:recommended_parties, [:constituency_ons_id, :site, :party_id],
              name: :index_recommended_parties_on_constituency_site_party, unique: true)
  end

  def down
    remove_index(:recommended_parties, [:constituency_ons_id, :site, :party_id])
    add_index(:recommended_parties, [:constituency_ons_id, :party_id, :site],
              name: :index_recommended_parties_on_site_and_constituency_and_party)
  end
end
