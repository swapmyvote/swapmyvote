require "csv"
require_relative "constituencies_original_with_ons_csv"
require_relative "electoral_calculus_constituencies_tsv"

# This maps Electoral calculus polls data provided per constituency to from usable by SMV
# - EC name is mapped to an ONS id
# - party names mapped to SMV party IDs
# - loop over each party/constituency combo, not over constituencies
# - takes care of mapping the 'nationalist vote' to the appropriate party.

MAPPING_FILE = "db/fixtures/electoral_calculus_constituency_mapping_to_mysoc.yml"

class ElectoralCalculusConstituenciesPollsRaw
  attr_reader :parties_by_party_code

  include Enumerable

  def initialize
    @parties_by_party_code = {
      con:    Party.find_by(name: "Conservatives"),
      green:  Party.find_by(name: "Green"),
      lab:    Party.find_by(name: "Labour"),
      libdem: Party.find_by(name: "Liberal Democrats"),
      snp:    Party.find_by(name: "SNP"),
      plaid:  Party.find_by(name: "Plaid Cymru"),
      reform: Party.find_by(name: "Reform")
    }

    missing_parties = @parties_by_party_code.select{ |_key, value| value.nil? }

    raise "Can't find these parties: #{missing_parties.keys}" unless missing_parties.count.zero?
  end

  # rubocop:disable Metrics/MethodLength
  def each
    failed_ons_lookup = Set.new

    ElectoralCalculusConstituenciesTsv.new.each do |data|
      constituency_name = data[:constituency_name]
      constituency_ons_id = constituency_ons_id_from_ec_constituency_name(constituency_name)

      if constituency_ons_id.nil?
        # puts "failed ons id lookup for #{constituency_name} "
        failed_ons_lookup.add(constituency_name)
        next
      end

      vote_data = find_nationalist_vote(data[:votes], constituency_ons_id, constituency_name)

      vote_data.each_key do |party|
        yield party_and_constituency_data(vote_data, party, constituency_ons_id)
      end
    end

    return unless failed_ons_lookup.size.positive?

    puts "\n\nElectoral Calculus Constituencies where no ONS id found (count: #{failed_ons_lookup.size})"
    pp failed_ons_lookup.to_a.sort

    puts "\n\nThe mapping file \"#{MAPPING_FILE}\" should be updated\n"
    exit 1
  end

  def party_and_constituency_data(vote_data, party, constituency_ons_id)
    {
      vote_percent: vote_data[party][:percent].to_f,
      party_id: parties_by_party_code[party].id,
      party_name: parties_by_party_code[party].name,
      constituency_ons_id: constituency_ons_id,
      conversion_note: vote_data[party][:note]
    }
  end

  def find_nationalist_vote(vote_data, constituency_ons_id, constituency_name)
    country = constituency_ons_id[0]

    if country == "S"
      vote_data[:snp] = { percent: vote_data[:nat][:percent], note: "(Assigning nationalist vote to SNP)" }
    elsif country == "W"
      vote_data[:plaid] = { percent: vote_data[:nat][:percent], note: "(Assigning nationalist vote to Plaid)" }
    elsif %w[S E W N].exclude?(country)
      throw "Invalid country '#{country}' for #{constituency_name};"
    end
    vote_data.delete(:nat)

    return vote_data
  end

  private def constituency_ons_id_from_ec_constituency_name(name)
    # right now, this misses just 78 constituencies.
    ons_id = my_soc_constituency_ons_ids_by_name[name]
    return ons_id if ons_id

    # this step gets us down to 24 missed constituencies
    alt_name = alternative_compass_names_for_ec(name)
    ons_id = my_soc_constituency_ons_ids_by_name[alt_name]
    return ons_id if ons_id

    manual_map_name = manual_map_name_from_ec(name)
    ons_id = my_soc_constituency_ons_ids_by_name[manual_map_name]
    return ons_id if ons_id

    return nil
  end

  private def my_soc_constituency_ons_ids_by_name
    return @my_soc_constituency_ons_ids_by_name if defined?(@my_soc_constituency_ons_ids_by_name)

    hash = {}
    MysocietyConstituenciesCsv.new.each do |c|
      hash[c[:name]] = c[:ons_id]
    end

    return @my_soc_constituency_ons_ids_by_name = hash
  end

  private def manual_map
    defined?(@manual_map) ? @manual_map : @manual_map = YAML.load_file(MAPPING_FILE)
  end

  private def  manual_map_name_from_ec(name)
    manual_map[name]
  end

  private def alternative_compass_names_for_ec(name)
    #
    # Hacky attempt to switch compass points as EC uses them
    #   Leicestershire North West
    #   Ayrshire Central
    # to the standard names from boundary commission
    #   Central Ayrshire
    #   North West Leicestershire
    #
    compass_points = [
      /North/,
      /South/,
      /East/,
      /West/,
      /Mid/,
      /Central/
    ]

    # derive the place name without compass points
    place_name = name
    compass_points.each do |point|
      place_name = place_name.gsub(point, "").strip.gsub("  ", " ")
    end

    return if place_name == name # no compass points found
    return unless name.include?(place_name) # we didn't isolate the simple place name

    # remove the place name from the original text, leaving just the compass points in order
    points_text = name.gsub(place_name, "").strip.gsub("  ", " ")

    return [points_text, place_name].join(" ")
  end
end
