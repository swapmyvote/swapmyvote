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
# require_relative "fixtures/electoral_calculus_polls"
require_relative "fixtures/mrp_averages_polls"
require_relative "fixtures/tactical_vote_stt_recs"
require_relative "fixtures/tactical_vote_sprintforpr_recs"
require_relative "fixtures/tactical_vote_tacticalvote_recs"
require_relative "fixtures/tactical_vote_siu_recs"
require_relative "fixtures/tactical_vote_tacticalvote_co_uk_recs"
require_relative "fixtures/tactical_vote_getvoting_recs"
require_relative "fixtures/tactical_vote_voteclimate_recs"

puts "\n\nParties selected for GE"

parties_for_ge = Party.master_list.select { |p| p[:ge_default] }

parties_for_ge.each do |party_attributes|
  party = Party.find_or_initialize_by(name: party_attributes[:name])
  party.update!(party_attributes.slice(:smv_code, :color))
  puts party_attributes.slice(:name, :smv_code)
end

unique_smv_codes = Party.all.each_with_object(Set.new) { |p, set| set.add(p.smv_code) }
if Party.count > unique_smv_codes.count
  puts "Party SMV codes are not unique"
  puts "Party SMV Codes #{Party.all.pluck(:name, :smv_code)}"
  exit(1)
end

# ---------------------------------------------------------------------------------

puts "\n\nONS Constituencies"

constituencies_csv = MysocietyConstituenciesCsv.new

constituencies = constituencies_csv.map do |constituency|
  puts "#{constituency[:ons_id]} #{constituency[:name]}"
  # From Rails 7 onwards we don't need to specify the timestamps:
  # https://blog.kiprosh.com/rails-7-adds-new-options-to-upsert_all/#recordtimestamps
  constituency.slice(:name, :ons_id).merge(created_at: Time.current, updated_at: Time.current)
end
OnsConstituency.upsert_all(constituencies, unique_by: :ons_id)

puts "#{OnsConstituency.count} ONS Constituencies loaded\n\n"

# ---------------------------------------------------------------------------------

# puts "\n\nPolls Data from Electoral calculus\n\n"

# ElectoralCalculusPolls.new.load

puts "\n\nPolls Data from MRP averages\n\n"

MrpAveragesPolls.new.load

# ---------------------------------------------------------------------------------

# puts "\n\nRecommendations aggregated by LiveFromBrexit\n\n"

# Recommendation.refresh_from_json(progress: true)

puts "\n\nLoading Recommendations from STT"

TacticalVoteSttRecs.new.load

puts "\n\nLoading Recommendations from SprintForPr"

TacticalVoteSprintforprRecs.new.load

puts "\n\nLoading Recommendations from tactical.vote"

TacticalVoteTacticalVoteRecs.new.load

puts "\n\nLoading Recommendations from scotlandinunion.co.uk"

TacticalVoteSiuRecs.new.load

puts "\n\nLoading Recommendations from tacticalvote.co.uk"

TacticalVoteTacticalVoteCoUkRecs.new.load

puts "\n\nLoading Recommendations from getvoting.org"

TacticalVoteGetvotingRecs.new.load

puts "\n\nLoading Recommendations from voteclimate.uk"

TacticalVoteVoteclimateRecs.new.load

r_c_count = Recommendation.left_joins(:constituency).where(ons_constituencies: { ons_id: nil }).count
puts "There are #{r_c_count} Recommendation records with no matching OnsConstituency" unless r_c_count.zero?

rp_p_count = RecommendedParty.left_joins(:party).where(parties: { id: nil }).count
puts "There are #{rp_p_count} RecommendationParty records with no matching Party" unless rp_p_count.zero?

rp_c_count = RecommendedParty.left_joins(:constituency).where(ons_constituencies: { ons_id: nil }).count
puts "There are #{rp_c_count} RecommendationParty records with no matching OnsConstituency" unless rp_c_count.zero?

# ---------------------------------------------------------------------------------

puts "\n\nCalculate Marginal Score\n\n"

Poll.calculate_marginal_score(progress: true)

puts "\n\n"
