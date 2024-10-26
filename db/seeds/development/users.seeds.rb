# rubocop:disable Metrics/MethodLength
def create_random_user(i, preferred_party_id, willing_party_id)
  gender = rand > 0.5 ? "female" : "male"
  firstname = gender == "male" ? Random.firstname_male : Random.firstname_female

  constituency = OnsConstituency.all.sample
  password = firstname + firstname

  user = User.create(
    name: "#{firstname} #{Random.lastname}",
    email: "#{firstname.downcase}.#{i}-#{preferred_party_id}-#{willing_party_id}@example.com",
    password: password,
    constituency_ons_id: constituency.ons_id,
    preferred_party_id: preferred_party_id,
    willing_party_id: willing_party_id
  )

  unless user.valid?
    puts "User #{user.email} not created: #{user.errors.full_messages}"
    return
  end

  build_identity(user.id, i, gender)

  puts "User ##{user.id} #{user.name} <#{user.email}> created in #{constituency.name} with password #{password}"
  puts "   preferred #{user.preferred_party.short_name}, willing #{user.willing_party.short_name}"
end

def build_identity(user_id, i, gender)
  Identity.create!(
    user_id: user_id,
    provider: provider_array.sample,
    image_url: format("https://api.randomuser.me/portraits/med/%s/#{i % 100}.jpg",
                      (gender == "male" ? "men" : "women"))
  )
end

def provider_array
  [:twitter, :facebook]
end

puts "Creating users"

starting_user_count = User.count
puts starting_user_count.zero? ? "No existing users" : "#{starting_user_count} users already in database"
puts "\n"

parties = Party.all
5.times do |i|
  parties.each do |preferred|
    parties.each do |willing|
      next if preferred.id == willing.id
      create_random_user(i, preferred.id, willing.id)
    end
  end
end

puts "\nFinished user creation, #{User.count} users in database, #{User.count - starting_user_count} users added"
