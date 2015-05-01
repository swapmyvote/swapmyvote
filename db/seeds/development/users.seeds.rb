10.times do |i|
  firstname = Random.firstname
  User.create(
    name: "#{firstname} #{Random.lastname}",
    email: "#{firstname.downcase}@example.com",
    constituency_id: rand(1 + Constituency.count()),
    preferred_party_id: 1,
    willing_party_id: 2,
    image: "http://api.randomuser.me/portraits/med/men/#{i}.jpg"
  )
end

10.times do |i|
  firstname = Random.firstname
  User.create(
    name: "#{firstname} #{Random.lastname}",
    email: "#{firstname.downcase}@example.com",
    constituency_id: rand(1 + Constituency.count()),
    preferred_party_id: 1,
    willing_party_id: 3,
    image: "http://api.randomuser.me/portraits/med/men/#{i}.jpg"
  )
end


10.times do |i|
  firstname = Random.firstname
  User.create(
    name: "#{firstname} #{Random.lastname}",
    email: "#{firstname.downcase}@example.com",
    constituency_id: rand(1 + Constituency.count()),
    preferred_party_id: 2,
    willing_party_id: 3,
    image: "http://api.randomuser.me/portraits/med/men/#{i}.jpg"
  )
end