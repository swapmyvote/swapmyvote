require "csv"
require_relative "constituencies_original_with_ons_csv"

# This encapsulates access to the TSV which provides the projected
# vote for each party for each constituency. The tsv is produced by
# copy and pasting the html table from the page
# https://www.electoralcalculus.co.uk/orderedseats.html
# into a spreadsheet, which must then be saved as tab-separated values.
# This is straightforward in LibreOffice spreadsheets, and
# presumably in other tools too.
# This then takes care of mapping the 'nationalist vote' to the
# appropriate party.

class ElectoralCalculusConstituenciesTsv
  include Enumerable

  TSV_FILE_NAME = "./db/fixtures/electoral_calculus_constituencies.tsv"

  def initialize
    @parties_by_party_code = {
      "con"    => Party.find_by(name: "Conservatives"),
      "green"  => Party.find_by(name: "Green Party"),
      "lab"    => Party.find_by(name: "Labour"),
      "libdem" => Party.find_by(name: "Liberal Democrats"),
      "ukip"   => Party.find_by(name: "UKIP"),
      "snp"    => Party.find_by(name: "SNP"),
      "plaid"  => Party.find_by(name: "Plaid Cymru"),
      "brexit" => Party.find_by(name: "Brexit Party")
    }

    missing_parties = @parties_by_party_code.select{ |_key, value| value.nil? }

    raise "Can't find these parties: #{missing_parties.keys}" unless missing_parties.count.zero?
  end

  # rubocop:disable Metrics/MethodLength
  def each
    CSV.foreach(TSV_FILE_NAME, headers: false, col_sep: "\t") do |data|
      unless data.length == 17
        raise ArgumentError, "Input fields #{data.to_h.keys} do not have expected length 17"
      end

      constituency_name = data[2]
      constituency_ons_id = ons_ids_by_constituency_name[constituency_name]
      if constituency_ons_id.nil?
        raise ArgumentError, "failed ons id lookup for #{constituency_name} "
      end
      country = constituency_ons_id[0]

      votes = {
        "con" => { percent: data[6] },
        "lab" => { percent: data[7] },
        "libdem" => { percent: data[8] },
        "brexit" => { percent: data[9] },
        "green" => { percent: data[10] },
        "ukip" => { percent: data[12] }
      }

      if country == "S"
        votes["snp"] = { percent: data[11], note: "(Assigning nationalist vote to SNP)" }
      elsif country == "W"
        votes["plaid"] = { percent: data[11], note: "(Assigning nationalist vote to Plaid Cymru)" }
      elsif %w[S E W N].exclude?(country)
        throw "Invalid country '#{country}' for #{constituency_name};"
      end

      votes.each_key do |party|
        data_transformed = {
          vote_percent: votes[party][:percent].to_f,
          party_id: @parties_by_party_code[party].id,
          party_name: @parties_by_party_code[party].name,
          constituency_ons_id: constituency_ons_id,
          constituency_name: constituency_name,
          conversion_note: votes[party][:note]
        }

        yield data_transformed
      end
    end
  end

  private def original_constituencies_with_ons_csv
    OriginalConstituenciesWithOnsCsv
      .new("db/fixtures/constituency_original_names_with_ons_ids.csv")
  end

  private def ons_ids_by_constituency_name
    return @ons_ids_by_constituency_name if defined?(@ons_ids_by_constituency_name)

    @ons_ids_by_constituency_name = original_constituencies_with_ons_csv.each_with_object({}) do |c, hash|
      hash[c[:name]] = c[:ons_id]
    end

    return @ons_ids_by_constituency_name
  end
end
