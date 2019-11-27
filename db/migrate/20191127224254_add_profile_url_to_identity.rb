class AddProfileUrlToIdentity < ActiveRecord::Migration[5.2]
  def change
    add_column :identities, :profile_url, :string
  end
end
