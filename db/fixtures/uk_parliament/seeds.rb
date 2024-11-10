require_relative "../../../app/helpers/application_helper"

extend ApplicationHelper

puts "Override election type is #{election_type_override.inspect}"

if election_type_override.nil?
  puts "Assume by-election"
  require_relative "seeds_for_by_election"
elsif election_type_override == :general
  require_relative "seeds_for_general_election"
else
  require_relative "seeds_for_by_election"
end
