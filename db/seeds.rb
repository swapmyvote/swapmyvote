# This file should contain all the record creation needed to seed the database with its default values.
# The data can then be loaded with the rake db:seed (or created alongside the db with db:setup).
#
# Examples:
#
#   cities = City.create([{ name: 'Chicago' }, { name: 'Copenhagen' }])
#   Mayor.create(name: 'Emanuel', city: cities.first)


require "active_record/fixtures"
require "csv"

PARTIES = {
  "con"    => Party.find_or_create_by(name: "Conservatives", color: "#0087DC"),
  "green"  => Party.find_or_create_by(name: "Green Party", color: "#6AB023"),
  "lab"    => Party.find_or_create_by(name: "Labour", color: "#DC241f"),
  "libdem" => Party.find_or_create_by(name: "Liberal Democrats", color: "#FFB602"),
  "ukip"   => Party.find_or_create_by(name: "UKIP", color: "#70147A")
}
#Party.find_or_create_by name: "SNP", color: "#FFF95D"

File.open("db/fixtures/constituencies.json", "r") do |file|
  data = JSON.parse(file.read())
  for row in data["results"]["constituencies"]
    constituency = Constituency.find_or_create_by name: row["name"]
    for party in PARTIES.keys
      votes = (row[party].to_f * 100).to_i
      print "ADDING: #{constituency.name}, #{party}, #{votes}\n"
      poll = Poll.find_or_initialize_by constituency: constituency, party: PARTIES[party]
      poll.votes = votes
      poll.save
    end
  end
end