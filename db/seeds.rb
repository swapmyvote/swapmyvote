# This file should contain all the record creation needed to seed the database with its default values.
# The data can then be loaded with the rake db:seed (or created alongside the db with db:setup).
#
# Examples:
#
#   cities = City.create([{ name: 'Chicago' }, { name: 'Copenhagen' }])
#   Mayor.create(name: 'Emanuel', city: cities.first)


require "active_record/fixtures"


Party.find_or_create_by name: "Conservatives"
Party.find_or_create_by name: "Green Party"
Party.find_or_create_by name: "Labour"
Party.find_or_create_by name: "Liberal Democrats"
Party.find_or_create_by name: "SNP"
Party.find_or_create_by name: "UKIP"

for name in File.read("db/fixtures/constituencies.csv").split("\n")
  Constituency.find_or_create_by name: name
end