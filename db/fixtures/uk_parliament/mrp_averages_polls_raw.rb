require_relative "mrp_averages_csv"
require_relative "mysociety_constituencies_csv"

# This maps mrp averages polls data provided per constituency to form usable by SMV
# - constituency short code is mapped to an ONS id
# - loop over each party/constituency combo, not over constituencies

class MrpAveragesPollsRaw
  attr_reader :parties_by_party_code

  include Enumerable

  def initialize
    @parties_by_party_code = {
      con:    Party.find_by(smv_code: :con),
      green:  Party.find_by(smv_code: :green),
      lab:    Party.find_by(smv_code: :lab),
      libdem: Party.find_by(smv_code: :libdem),
      snp:    Party.find_by(smv_code: :snp),
      plaid:  Party.find_by(smv_code: :plaid),
      reform: Party.find_by(smv_code: :reform)
    }

    @wrapper = MrpAveragesCsv.new

    missing_parties = @parties_by_party_code.select{ |_key, value| value.nil? }

    raise ArgumentError, "Can't find these parties: #{missing_parties.keys}" unless missing_parties.count.zero?
  end

  # rubocop:disable Metrics/MethodLength
  def each
    failed_ons_lookup = Set.new

    @wrapper.data.each do |data|
      short_code = data[:short_code]
      constituency_ons_id = my_soc_constituency_ons_ids_by_name[short_code]

      if constituency_ons_id.nil?
        failed_ons_lookup.add(short_code)
        next
      end

      @parties_by_party_code.each_key do |party_code|
        yield party_and_constituency_data(data, party_code, constituency_ons_id)
      end
    end

    return unless failed_ons_lookup.size.positive?

    puts "\n\nMRP Averages Constituencies where no ONS id found (count: #{failed_ons_lookup.size})"
    pp failed_ons_lookup.to_a.sort
    exit 1
  end

  def party_and_constituency_data(data, party_code, constituency_ons_id)
    {
      vote_percent: data[party_code].gsub("%", "").to_f,
      party_id: parties_by_party_code[party_code].id,
      party_name: parties_by_party_code[party_code].name,
      constituency_ons_id: constituency_ons_id
    }
  end

  private def my_soc_constituency_ons_ids_by_name
    return @my_soc_constituency_ons_ids_by_name if defined?(@my_soc_constituency_ons_ids_by_name)

    hash = {}
    MysocietyConstituenciesCsv.new.each do |c|
      hash[c[:short_code]] = c[:ons_id]
    end

    return @my_soc_constituency_ons_ids_by_name = hash
  end
end
