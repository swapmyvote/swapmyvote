class RecommendationsRefreshDec08 < ActiveRecord::Migration[5.2]
  def up
    Recommendation.refresh_from_json(progress: true)
  end

  def down
    # nothing to do
  end
end
