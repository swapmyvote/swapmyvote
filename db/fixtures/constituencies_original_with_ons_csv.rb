require "csv"

# This is an encapsulation of the CSV which maps "old" constituency
# names (e.g. in table presently named "constituencies", now redundant)
# to the ONS ids used in the "new" constituency table
# (presently named "ons_constituencies")
# The csv is currently found at
# db/fixtures/constituency_original_names_with_ons_ids.csv
# It was derived partly programmatically, and partly manually.
# It can't be downloaded from anywhere.

class OriginalConstituenciesWithOnsCsv
  include Enumerable

  attr_reader :file_name

  ID_KEY = "ons_id"
  NAME_KEY = "original_constituency_name"

  REQUIRED_INPUT_KEYS = [ ID_KEY , NAME_KEY ]

  def initialize(file_name)
    @file_name = file_name
    raise ArgumentError, "single argument file_name required" unless file_name && file_name != ""
  end

  def each
    CSV.foreach(file_name, headers: true, col_sep: ",") do |data|
      unless data.to_h.keys[0] == ID_KEY && data.to_h.keys[1] == NAME_KEY
        raise ArgumentError, "Input fields #{data.to_h.keys} do not match #{REQUIRED_INPUT_KEYS}"
      end

      data_transformed = {
        ons_id: data[ID_KEY],
        name: data[NAME_KEY]
      }

      yield data_transformed
    end
  end
end
