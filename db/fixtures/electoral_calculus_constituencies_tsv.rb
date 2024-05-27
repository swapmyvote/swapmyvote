require "csv"
require_relative "constituencies_original_with_ons_csv"

# This encapsulates access to the TSV which provides the projected
# vote for each party for each constituency. The tsv is produced by
# copy and pasting the html table from the page
# https://www.electoralcalculus.co.uk/orderedseats.html
# into a spreadsheet, which must then be saved as tab-separated values.
# This is straightforward in LibreOffice spreadsheets, and
# presumably in other tools too.

class ElectoralCalculusConstituenciesTsv
  attr_reader :file_name

  include Enumerable

  TSV_FILE_NAME = "./db/fixtures/electoral_calculus_constituencies.tsv"

  def initialize
    @file_name = TSV_FILE_NAME
  end

  # rubocop:disable Metrics/MethodLength
  def each
    CSV.foreach(file_name, headers: false, col_sep: "\t") do |data|
      unless data.length == 16
        raise ArgumentError, "Input fields #{data} do not have expected length 16"
      end

      constituency_name = data[2]

      votes = {
        con:    { percent: data[6] },
        lab:    { percent: data[7] },
        libdem: { percent: data[8] },
        reform: { percent: data[9] },
        green:  { percent: data[10] },
        nat:    { percent: data[11] }
      }

      data_transformed = {
        votes: votes,
        constituency_name: constituency_name,
      }

      yield data_transformed
    end
  end
end
