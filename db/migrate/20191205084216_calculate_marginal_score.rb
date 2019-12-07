class CalculateMarginalScore < ActiveRecord::Migration[5.2]
  def up
    Poll.calculate_marginal_score(progress: true)
  end

  def down
    # Nothing to do
  end
end
