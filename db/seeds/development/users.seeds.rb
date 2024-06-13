# rubocop:disable Metrics/MethodLength
def create_random_user(i, preferred_party_id, willing_party_id)
  gender = rand > 0.5 ? "female" : "male"
  firstname = gender == "male" ? Random.firstname_male : Random.firstname_female

  ons_constituency_id = OnsConstituency.all.pluck(:id).sample

  ons_id = OnsConstituency.find_by(id: ons_constituency_id).ons_id

  user = User.create(
    name: "#{firstname} #{Random.lastname}",
    email: "#{firstname.downcase}.#{i}-#{preferred_party_id}-#{willing_party_id}@example.com",
    constituency_ons_id: ons_id,
    preferred_party_id: preferred_party_id,
    willing_party_id: willing_party_id
  )

  unless user.valid?
    puts "User #{user.email} not created: #{user.errors.full_messages}"
    return
  end

  build_identity(user.id, i, gender)
end

def build_identity(user_id, i, gender)
  Identity.create!(
    user_id: user_id,
    provider: provider_array.sample,
    image_url: format("https://api.randomuser.me/portraits/med/%s/#{i}.jpg",
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

5.times do |i|
  create_random_user(i, 1, 2)
  create_random_user(i, 1, 3)

  create_random_user(i, 2, 1)
  create_random_user(i, 2, 3)

  create_random_user(i, 3, 1)
  create_random_user(i, 3, 2)

  create_random_user(i, 4, 1)
  create_random_user(i, 1, 4)

  create_random_user(i, 4, 2)
  create_random_user(i, 2, 4)

  create_random_user(i, 4, 3)
  create_random_user(i, 3, 4)
end

puts "\nFinished user creation, #{User.count} users in database, #{User.count - starting_user_count} users added"
