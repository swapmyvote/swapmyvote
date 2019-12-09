class AddPasswordDigestToIdentity < ActiveRecord::Migration[5.2]
  def change
    add_column :identities, :password_digest, :string
  end
end
