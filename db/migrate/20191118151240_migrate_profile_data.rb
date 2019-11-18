class MigrateProfileData < ActiveRecord::Migration[5.2]
  def up
    User.all.each do |user|
      next if user.users_social_profile.present?
      next if user.provider.blank?

      puts "Migrating user #{user.name} for #{user.provider}"

      usp = UsersSocialProfile.new
      usp.user_id = user.id
      usp.uid = user.uid
      usp.provider = user.provider
      usp.save!
    end
  end

  def down
    # No reverse of the data migration, up copies data from one table to another, and deleting the copy
    # would be unsafe in case it has changed
  end
end
