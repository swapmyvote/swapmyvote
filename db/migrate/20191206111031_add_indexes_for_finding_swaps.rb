class AddIndexesForFindingSwaps < ActiveRecord::Migration[5.2]
  def change
    add_index :users, [
        :preferred_party_id,
        :willing_party_id,
        :constituency_ons_id
      ], name: "index_users_on_complementary_users"
    add_index :polls, [
        :party_id,
        :marginal_score,
      ]
    end
end
