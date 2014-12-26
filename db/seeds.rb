# This file should contain all the record creation needed to seed the database with its default values.
# The data can then be loaded with the rake db:seed (or created alongside the db with db:setup).
#
# Examples:
#
#   cities = City.create([{ name: 'Chicago' }, { name: 'Copenhagen' }])
#   Mayor.create(name: 'Emanuel', city: cities.first)


require "active_record/fixtures"


Party.find_or_create_by name: "Conservatives", color: "#0087DC"
Party.find_or_create_by name: "Green Party", color: "#6AB023"
Party.find_or_create_by name: "Labour", color: "#DC241f"
Party.find_or_create_by name: "Liberal Democrats", color: "#FFB602"
Party.find_or_create_by name: "SNP", color: "#FFF95D"
Party.find_or_create_by name: "UKIP", color: "#70147A"

for name in File.read("db/fixtures/constituencies.csv").split("\n")
  Constituency.find_or_create_by name: name
end