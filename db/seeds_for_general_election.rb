# This file should contain all the record creation needed to seed the database with its default values.
# The data can then be loaded with the rake db:seed (or created alongside the db with db:setup).
#
# Examples:
#
#   cities = City.create([{ name: 'Chicago' }, { name: 'Copenhagen' }])
#   Mayor.create(name: 'Emanuel', city: cities.first)

require "active_record/fixtures"
require "csv"
require_relative "fixtures/mysociety_constituencies_csv"
require_relative "fixtures/electoral_calculus_constituencies_tsv"

Party.find_or_create_by(name: "Conservatives", color: "#0087DC")
Party.find_or_create_by(name: "Green", color: "#6AB023")
Party.find_or_create_by(name: "Labour", color: "#DC241f")
Party.find_or_create_by(name: "Liberal Democrats", color: "#FFB602")
Party.find_or_create_by(name: "SNP", color: "#FFF95D")
Party.find_or_create_by(name: "Plaid Cymru", color: "#008142")
Party.find_or_create_by(name: "Reform", color: "#5bc0de")

# ---------------------------------------------------------------------------------

puts "\nONS Constituencies"

constituencies_csv = MysocietyConstituenciesCsv.new("db/fixtures/mysociety_parl_constituencies_2025.csv")

constituencies_csv.each do |constituency|
  # puts constituency
  cons = OnsConstituency.find_or_initialize_by ons_id: constituency[:ons_id]
  puts "#{cons.ons_id} #{cons.name}"
  cons.update!(constituency) if cons.ons_id
end

puts "#{OnsConstituency.count} ONS Constituencies loaded\n\n"

# ---------------------------------------------------------------------------------

# Possible backup first
# Poll.all.map(&:as_json).map do |p| p.slice(
#   "id", "old_constituency_id", "constituency_ons_id", "party_id", "votes"
# )
# end.to_yaml

puts "\n\nNO POLLS DATA LOADED - this is emergency fix code \n\n"

# puts "\n\nPolls Data from Electoral calculus\n\n"

# # TODO: this code is currently duplicated in db/migrate/20191126122621_refresh_polls.rb

# polls_data = ElectoralCalculusConstituenciesTsv.new

# polls_data.each do |party_result|
#   vote_count = (party_result[:vote_percent] * 100).to_i
#   ons_id = party_result[:constituency_ons_id]
#   party_id = party_result[:party_id]
#   conversion_note = party_result[:conversion_note]

#   unless conversion_note.nil?
#     puts "\nConversion Note: #{party_result} "
#   end

#   poll = Poll.find_or_initialize_by constituency_ons_id: ons_id, party_id: party_id
#   poll.votes = vote_count
#   poll.save!
#   print "."
# end
puts "\n\n"

# ---------------------------------------------------------------------------------

puts "\n\nNO RECOMMENDATIONS DATA LOADED - this is emergency fix code \n\n"

# puts "\n\nRecommendations aggregated by LiveFromBrexit\n\n"

# Recommendation.refresh_from_json(progress: true)

# ---------------------------------------------------------------------------------

puts "\n\nCalculate Marginal Score\n\n"

Poll.calculate_marginal_score(progress: true)

puts "\n\n"
