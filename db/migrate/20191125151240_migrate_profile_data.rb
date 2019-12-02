class MigrateProfileData < ActiveRecord::Migration[5.2]
  def up
    User.all.each do |user|
      next if user.identity.present?
      next if user[:provider].blank?

      puts "Migrating user #{user.name} for #{user[:provider]} to identity table."

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
    # We remove the uid, provider, and image_url columns from the database in the next migration,
    # reversing it should reinstate the columns with empty contents, so we can re-populate them now

    # We should not repopulate the email column, because the contents might be different from the provider email

    User.all.each do |user|
      next unless user.identity.present?

      puts "Reversing migration, copying data from user #{user.name} for #{user.identity.provider}"

      user.uid = user.identity.uid
      user.provider = user.identity.provider
      user.image = user.identity.image_url
      user.save!
    end
  end
end
