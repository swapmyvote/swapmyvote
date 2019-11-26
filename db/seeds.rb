# This file should contain all the record creation needed to seed the database with its default values.
# The data can then be loaded with the rake db:seed (or created alongside the db with db:setup).
#
# Examples:
#
#   cities = City.create([{ name: 'Chicago' }, { name: 'Copenhagen' }])
#   Mayor.create(name: 'Emanuel', city: cities.first)

require "active_record/fixtures"
require "csv"
require_relative "fixtures/ons_constituencies_csv"
require_relative "fixtures/livefrombrexit_recommendations_json"

PARTIES = {
  "con"    => Party.find_or_create_by(name: "Conservatives", color: "#0087DC"),
  "green"  => Party.find_or_create_by(name: "Green Party", color: "#6AB023"),
  "lab"    => Party.find_or_create_by(name: "Labour", color: "#DC241f"),
  "libdem" => Party.find_or_create_by(name: "Liberal Democrats", color: "#FFB602"),
  "ukip"   => Party.find_or_create_by(name: "UKIP", color: "#70147A"),
  "snp"    => Party.find_or_create_by(name: "SNP", color: "#FFF95D"),
  "plaid"  => Party.find_or_create_by(name: "Plaid Cymru", color: "#008142"),
  "brexit" => Party.find_or_create_by(name: "Brexit Party", color: "#5bc0de")
}
#

COUNTRIES = {}

[
    "East Ham", "West Ham", "South Shields", "Hull East", "Hull North",
    "Ashton under Lyne", "Hull West and Hessle", "West Bromwich East", "West Bromwich West",
    "Middlesbrough South and Cleveland East", "Basildon South and East Thurrock",
    "Worthing East and Shoreham", "Richmond", "Suffolk Central and Ipswich North",
    "Dorset Mid and Poole North", "Devon West and Torridge",
    "Faversham and Kent Mid", "South Holland and The Deepings", "Devon Central"
  ].each do |county|
  COUNTRIES[county] = "England"
end

[
    "East Kilbride Strathaven and Lesmahagow", "Ayrshire North and Arran",
    "Na h-Eileanan An Iar (Western Isles)", "Ayrshire Central", "East Lothian",
    "Aberdeenshire West and Kincardine"
  ].each do |county|
  COUNTRIES[county] = "Scotland"
end

[
    "Ynys Mon", "Carmarthen West and Pembrokeshire South"
  ].each do |county|
  COUNTRIES[county] = "Wales"
end

# ---------------------------------------------------------------------------------

puts "\nONS Constituencies"

ons_constituencies_csv = OnsConstituenciesCsv.new(
  "db/fixtures/Westminster_Parliamentary_Constituencies_December_2018" \
  "_Names_and_Codes_in_the_United_Kingdom.csv")

ons_constituencies_csv.each do |constituency|
  cons = OnsConstituency.find_or_initialize_by ons_id: constituency[:ons_id]
  puts "#{cons.ons_id} #{cons.name}"
  cons.update!(constituency)
end

puts "#{OnsConstituency.count} ONS Constituencies loaded\n\n"

# ---------------------------------------------------------------------------------

CSV.foreach("db/fixtures/constituency_locations.tsv", col_sep: "\t") do |data|
  name = data[0]
  country = data[5]

  m = name.match(/^((?:(?:North|East|South|West|Mid|The|City of) )+)(.*)/)
  if m
    name = "#{m[2]} #{m[1].strip}"
  end
  name = name.gsub(",", "")

  COUNTRIES[name] = country
  puts "#{name} is in #{country}"
end

puts

# ---------------------------------------------------------------------------------

original_constituencies_with_ons_csv = OriginalConstituenciesWithOnsCsv
  .new("db/fixtures/constituency_original_names_with_ons_ids.csv")

ons_ids_by_constituency_name = original_constituencies_with_ons_csv.each_with_object({}) do |c, hash|
  hash[c[:name]] = c[:ons_id]
end

# ---------------------------------------------------------------------------------

CSV.foreach("db/fixtures/constituencies.tsv", col_sep: "\t") do |data|
  name = data[2]

  constituency = Constituency.find_or_create_by name: name

  ons_id = ons_ids_by_constituency_name[constituency.name]

  votes = {
    "con" => data[6],
    "lab" => data[7],
    "libdem" => data[8],
    "ukip" => data[9],
    "green" => data[10]
  }

  country = COUNTRIES[name.gsub(",", "")]

  puts "[#{name}]"

  print "Country:\t#{country} "

  if country == "Scotland"
    print "(Assigning nationalist vote to SNP)"
    votes["snp"] = data[11]
  elsif country == "Wales"
    print "(Assigning nationalist vote to Plaid Cymru)"
    votes["plaid"] = data[11]
  elsif !["Scotland", "England", "Wales", "Northern Ireland"].include?(country)
    throw "Invalid country '#{country}' for #{name};"
  end
  puts

  puts "Polls:\t#{votes}"
  votes.keys.each do |party|
    vote_count = (votes[party].to_f * 100).to_i
    poll = Poll.find_or_initialize_by constituency_ons_id: ons_id, party: PARTIES[party]
    poll.votes = vote_count
    poll.save
  end

  puts
end

# ---------------------------------------------------------------------------------

recommendations_json = LivefrombrexitRecommendationsJson.new

recommendations_json.each do |rec_as_hash|
  rec = Recommendation.find_or_initialize_by(rec_as_hash.slice("site", "constituency_ons_id"))
  rec.text = rec_as_hash["recommendation"]
  rec.link = rec_as_hash["link"]
  rec.save!
end
