class AddMarginalScoreToPolls < ActiveRecord::Migration[5.2]
  def change
    add_column :polls, :marginal_score, :integer
  end
end
