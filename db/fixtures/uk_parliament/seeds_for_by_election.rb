# This file should contain all the record creation needed to seed the database with its default values.
# The data can then be loaded with the rake db:seed (or created alongside the db with db:setup).
#
# Examples:
#
#   cities = City.create([{ name: 'Chicago' }, { name: 'Copenhagen' }])
#   Mayor.create(name: 'Emanuel', city: cities.first)

require_relative "fixtures/be2022_yaml"
require_relative "fixtures/be2022/party"
require_relative "fixtures/be2022/candidate"
require_relative "../app/helpers/application_helper"

class SeedHelper
  include ApplicationHelper
end

puts "\nParties"

Db::Fixtures::Be2022::Party.all.each do |party|
  ::Party.find_or_create_by(name: party[:name], color: party[:colour])
  puts "Party #{party[:name]} created"
end

# ---------------------------------------------------------------------------------

puts "\nConstituencies"

Db::Fixtures::Be2022Yaml.data[:constituencies].each do |constituency|
  cons = OnsConstituency.find_or_initialize_by ons_id: constituency[:ons_id]
  puts "#{cons.ons_id} #{cons.name}"
  cons.update!(constituency.slice(:name, :ons_id))
end

puts "#{OnsConstituency.count} Constituencies loaded\n\n"

# ---------------------------------------------------------------------------------

puts "\n\nPolls Data\n\n"

Db::Fixtures::Be2022::Candidate.all.each do |candidate|
  vote_count = candidate[:votes_percent] ? (candidate[:votes_percent] * 100).to_i : nil
  ons_id = candidate[:constituency_ons_id]
  party_name = candidate[:party_name]

  party = ::Party.find_by(name: party_name)

  unless party
    raise "No matching party for #{party_name}"
  end

  poll = Poll.find_or_initialize_by constituency_ons_id: ons_id, party_id: party.id

  if vote_count
    poll.votes = vote_count
    poll.save!
  end
  print "."
end
puts "\n\n"

# ---------------------------------------------------------------------------------

puts "\n\nCalculate Marginal Score\n\n"

Poll.calculate_marginal_score(progress: true)

puts "\n\n"

# ---------------------------------------------------------------------------------

puts "\n\nVerifying canonical names include in api\n\n"

party_canonical_names = Party.canonical_names

Party.all.each do |party|
  unless party_canonical_names.include?(SeedHelper.new.canonical_name(party.name))
    puts "ERROR: canonical name for party #{party.name} not included in Party.REFERENCE_DATA - it's needed for API"
  end
  print "."
end

puts "\n\n"
