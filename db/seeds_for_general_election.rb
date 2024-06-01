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
require_relative "fixtures/electoral_calculus_polls"
require_relative "fixtures/tactical_vote_stt_recs"
require_relative "fixtures/tactical_vote_sprintforpr_recs"

Party.find_or_create_by(name: "Conservatives", color: "#0087DC")
Party.find_or_create_by(name: "Green", color: "#6AB023")
Party.find_or_create_by(name: "Labour", color: "#DC241f")
Party.find_or_create_by(name: "Liberal Democrats", color: "#FFB602")
Party.find_or_create_by(name: "SNP", color: "#FFF95D")
Party.find_or_create_by(name: "Plaid Cymru", color: "#008142")
Party.find_or_create_by(name: "Reform", color: "#5bc0de")

# ---------------------------------------------------------------------------------

puts "\nONS Constituencies"

constituencies_csv = MysocietyConstituenciesCsv.new

constituencies_csv.each do |constituency|
  # puts constituency
  cons = OnsConstituency.find_or_initialize_by ons_id: constituency[:ons_id]
  puts "#{cons.ons_id} #{cons.name}"
  cons.update!(constituency.slice(:name, :ons_id)) if cons.ons_id
end

puts "#{OnsConstituency.count} ONS Constituencies loaded\n\n"

# ---------------------------------------------------------------------------------

puts "\n\nPolls Data from Electoral calculus\n\n"

ElectoralCalculusPolls.new.load

# ---------------------------------------------------------------------------------

# puts "\n\nRecommendations aggregated by LiveFromBrexit\n\n"

# Recommendation.refresh_from_json(progress: true)

puts "\n\nLoading Recommendations from STT"

TacticalVoteSttRecs.new.load

puts "\n\nLoading Recommendations from SprintForPr"

TacticalVoteSprintforprRecs.new.load

# ---------------------------------------------------------------------------------

puts "\n\nCalculate Marginal Score\n\n"

Poll.calculate_marginal_score(progress: true)

puts "\n\n"
