class MigrateProfileData < ActiveRecord::Migration[5.2]
  def up
    User.all.each do |user|
      next if user.identity.present?
      next if user[:provider].blank?

      puts "Migrating user #{user.name} for #{user[:provider]}"

      identity = Identity.new
      identity.user_id = user.id
      identity.uid = user.uid
      identity.provider = user.provider
      identity.email = user.email
      identity.image_url = user.image
      identity.save!
    end
  end

  def down
    # No reverse of the data migration, up copies data from one table to another, and deleting the copy
    # would be unsafe in case it has changed
  end
end
