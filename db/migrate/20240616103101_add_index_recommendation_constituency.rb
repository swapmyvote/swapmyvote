class AddIndexRecommendationConstituency < ActiveRecord::Migration[5.2]
  def up
    remove_index(:recommendations, name: :index_recommendations_on_site_and_constituency_ons_id)

    # Putting constituency first helps queries that are only on
    # constituency; no need for another index optimised for database
    # seeding. If this doesn't work for the website, consider adding
    # an index rather than changing this one.
    add_index(:recommendations, [:constituency_ons_id, :site], unique: true)
  end

  def down
    remove_index(:recommendations, [:constituency_ons_id, :site])
    add_index(:recommendations, [:site, :constituency_ons_id],
              name: :index_recommendations_on_site_and_constituency_ons_id, unique: true)
  end
end
