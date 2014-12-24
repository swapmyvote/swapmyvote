# This file should contain all the record creation needed to seed the database with its default values.
# The data can then be loaded with the rake db:seed (or created alongside the db with db:setup).
#
# Examples:
#
#   cities = City.create([{ name: 'Chicago' }, { name: 'Copenhagen' }])
#   Mayor.create(name: 'Emanuel', city: cities.first)


require "active_record/fixtures"


Party.create name: "Conservatives"
Party.create name: "Green Party"
Party.create name: "Labour"
Party.create name: "Liberal Democrats"
Party.create name: "SNP"
Party.create name: "UKIP"

for name in File.read("db/fixtures/constituencies.csv").split("\n")
  Constituency.create name: name
end