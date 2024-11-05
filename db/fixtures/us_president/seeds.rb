# This file should contain all the record creation needed to seed the database with its default values.
# The data can then be loaded with the rake db:seed (or created alongside the db with db:setup).
#
# Examples:
#
#   cities = City.create([{ name: 'Chicago' }, { name: 'Copenhagen' }])
#   Mayor.create(name: 'Emanuel', city: cities.first)

require "active_record/fixtures"
require_relative "us_states_yml"

puts "\n\nParties selected for GE"

parties_data  = YAML.load_file(File.join(File.dirname(__FILE__), "parties.yml"))

parties_for_ge = Party.master_list(parties_data).select { |p| p[:ge_default] }

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

constituencies_csv = UsStatesYml.new

constituencies = constituencies_csv.data.map do |constituency|
  puts "#{constituency[:ons_id]} #{constituency[:name]}"
  # From Rails 7 onwards we don't need to specify the timestamps:
  # https://blog.kiprosh.com/rails-7-adds-new-options-to-upsert_all/#recordtimestamps
  constituency.slice(:name, :ons_id).merge(created_at: Time.current, updated_at: Time.current)
end
OnsConstituency.upsert_all(constituencies, unique_by: :ons_id)

puts "\n\n#{OnsConstituency.count} ONS Constituencies loaded\n\n"
