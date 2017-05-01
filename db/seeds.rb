# This file should contain all the record creation needed to seed the database with its default values.
# The data can then be loaded with the rake db:seed (or created alongside the db with db:setup).
#
# Examples:
#
#   cities = City.create([{ name: 'Chicago' }, { name: 'Copenhagen' }])
#   Mayor.create(name: 'Emanuel', city: cities.first)


require "active_record/fixtures"
require "csv"

ActiveRecord::Base.logger = nil

PARTIES = {
  "con"    => Party.find_or_create_by(name: "Conservatives", color: "#0087DC"),
  "green"  => Party.find_or_create_by(name: "Green Party", color: "#6AB023"),
  "lab"    => Party.find_or_create_by(name: "Labour", color: "#DC241f"),
  "libdem" => Party.find_or_create_by(name: "Liberal Democrats", color: "#FFB602"),
  "ukip"   => Party.find_or_create_by(name: "UKIP", color: "#70147A"),
  "snp"    => Party.find_or_create_by(name: "SNP", color: "#FFF95D"),
  "plaid"  => Party.find_or_create_by(name: "Plaid Cymru", color: "#008142")
}
#

COUNTRIES = {}

for county in [
    "East Ham", "West Ham", "South Shields", "Hull East", "Hull North",
    "Ashton under Lyne", "Hull West and Hessle", "West Bromwich East", "West Bromwich West",
    "Middlesbrough South and Cleveland East", "Basildon South and East Thurrock",
    "Worthing East and Shoreham", "Richmond", "Suffolk Central and Ipswich North",
    "Dorset Mid and Poole North", "Devon West and Torridge",
    "Faversham and Kent Mid", "South Holland and The Deepings", "Devon Central"
  ]
  COUNTRIES[county] = "England"
end

for county in [
    "East Kilbride Strathaven and Lesmahagow", "Ayrshire North and Arran",
    "Na h-Eileanan An Iar (Western Isles)", "Ayrshire Central", "East Lothian",
    "Aberdeenshire West and Kincardine"
  ]
  COUNTRIES[county] = "Scotland"
end

for county in [
    "Ynys Mon", "Carmarthen West and Pembrokeshire South"
  ]
  COUNTRIES[county] = "Wales"
end

File.open("db/fixtures/constituency_locations.csv", "r") do |file|
  lines = file.read().split("\n")
  for line in lines
    data = line.split("\t")
    name = data[0]
    country = data[5]
    
    if m = name.match(/^((?:(?:North|East|South|West|Mid|The|City of) )+)(.*)/)
      old_name = name
      name = "#{m[2]} #{m[1].strip()}"
    end
    name = name.gsub(",", "")
    
    COUNTRIES[name] = country
  end
end

# print COUNTRIES

File.open("db/fixtures/constituencies.csv", "r") do |file|
  lines = file.read().split("\n")
  for line in lines
    data = line.split("\t")
    name = data[2]
    
    constituency = Constituency.find_or_create_by name: name
    votes = {
      "con" => data[6],
      "lab" => data[7],
      "libdem" => data[8],
      "ukip" => data[9],
      "green" => data[10]
    }
    
    country = COUNTRIES[name.gsub(",", "")]
    
    print "[#{name}]\n"
    
    print "Country:\t#{country} "
    
    if country == "Scotland"
      print "(Assigning nationalist vote to SNP)"
      votes["snp"] = data[11]
    elsif country == "Wales"
      print "(Assigning nationalist vote to Plaid Cymru)"
      votes["plaid"] = data[11]
    elsif not ["Scotland", "England", "Wales", "Northern Ireland"].include?(country) 
      print "MISSING COUNTRY: #{name}; #{country}\n"
      throw "ERROR! No country found!"
    end
    print "\n"
    
    print "Polls:\t#{votes}\n"
    for party in votes.keys
      vote_count = (votes[party].to_f * 100).to_i
      poll = Poll.find_or_initialize_by constituency: constituency, party: PARTIES[party]
      poll.votes = vote_count
      poll.save
    end
    
    print "\n"
  end
end