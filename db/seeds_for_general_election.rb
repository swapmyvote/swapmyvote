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
require_relative "fixtures/tactical_vote_tacticalvote_recs"

puts "\n\nParties selected for GE"

parties_for_ge = Party.master_list.select { |p| p[:ge_default] }

parties_for_ge.each do |party_attributes|
  party = Party.find_or_initialize_by(name: party_attributes[:name])
  party.update!(party_attributes.slice(:smv_code, :colour))
  puts party_attributes.slice(:name, :smv_code)
end

# ---------------------------------------------------------------------------------

puts "\n\nONS Constituencies"

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

puts "\n\nLoading Recommendations from tactical.vote"

TacticalVoteTacticalVoteRecs.new.load

# ---------------------------------------------------------------------------------

puts "\n\nCalculate Marginal Score\n\n"

Poll.calculate_marginal_score(progress: true)

puts "\n\n"
