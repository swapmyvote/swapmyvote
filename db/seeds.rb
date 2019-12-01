# This file should contain all the record creation needed to seed the database with its default values.
# The data can then be loaded with the rake db:seed (or created alongside the db with db:setup).
#
# Examples:
#
#   cities = City.create([{ name: 'Chicago' }, { name: 'Copenhagen' }])
#   Mayor.create(name: 'Emanuel', city: cities.first)

require "active_record/fixtures"
require "csv"
require_relative "fixtures/ons_constituencies_csv"
require_relative "fixtures/livefrombrexit_recommendations_json"
require_relative "fixtures/electoral_calculus_constituencies_tsv"

Party.find_or_create_by(name: "Conservatives", color: "#0087DC")
Party.find_or_create_by(name: "Green Party", color: "#6AB023")
Party.find_or_create_by(name: "Labour", color: "#DC241f")
Party.find_or_create_by(name: "Liberal Democrats", color: "#FFB602")
Party.find_or_create_by(name: "UKIP", color: "#70147A")
Party.find_or_create_by(name: "SNP", color: "#FFF95D")
Party.find_or_create_by(name: "Plaid Cymru", color: "#008142")
Party.find_or_create_by(name: "Brexit Party", color: "#5bc0de")

# ---------------------------------------------------------------------------------

puts "\nONS Constituencies"

ons_constituencies_csv = OnsConstituenciesCsv.new(
  "db/fixtures/Westminster_Parliamentary_Constituencies_December_2018" \
  "_Names_and_Codes_in_the_United_Kingdom.csv")

ons_constituencies_csv.each do |constituency|
  cons = OnsConstituency.find_or_initialize_by ons_id: constituency[:ons_id]
  puts "#{cons.ons_id} #{cons.name}"
  cons.update!(constituency)
end

puts "#{OnsConstituency.count} ONS Constituencies loaded\n\n"

# ---------------------------------------------------------------------------------

# Possible backup first
# Poll.all.map(&:as_json).map do |p| p.slice(
#   "id", "old_constituency_id", "constituency_ons_id", "party_id", "votes"
# )
# end.to_yaml

puts "\n\nPolls Data from Electoral calculus\n\n"

polls_data = ElectoralCalculusConstituenciesTsv.new

polls_data.each do |party_result|
  vote_count = (party_result[:vote_percent] * 100).to_i
  ons_id = party_result[:constituency_ons_id]
  party_id = party_result[:party_id]
  conversion_note = party_result[:conversion_note]

  unless conversion_note.nil?
    puts "\nConversion Note: #{party_result} "
  end

  poll = Poll.find_or_initialize_by constituency_ons_id: ons_id, party_id: party_id
  poll.votes = vote_count
  poll.save!
  print "."
end
puts "\n\n"

# ---------------------------------------------------------------------------------

puts "\n\nRecommendations aggregated by LiveFromBrexit\n\n"

recommendations_json = LivefrombrexitRecommendationsJson.new

recommendations_json.each do |rec_as_hash|
  rec = Recommendation.find_or_initialize_by(rec_as_hash.slice("site", "constituency_ons_id"))
  rec.text = rec_as_hash["recommendation"]
  rec.link = rec_as_hash["link"]
  rec.save!
  print "."
end
puts "\n\n"
