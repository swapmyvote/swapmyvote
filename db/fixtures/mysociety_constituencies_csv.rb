# This encapsulates access to the reference CSV for constituencies
# from mysociety
# Updates to the file can be obtained from
# https://pages.mysociety.org/2025-constituencies/datasets/parliament_con_2025/latestm

class MysocietyConstituenciesCsv
  # First shot at using mysociety_constituencies_csv
  #
  # PROBLEMS TO BE FIXED with gss/ons ids
  # 1. new codes don't match the old codes where the constituency is unchanged,
  #    which breaks the linkage to the polling data from electoral calculus
  # 2. some of the gss codes are blank, the NI ones, are blank. so these are skipped.
  #
  # We should be able to fix this with the "PARL10 to PARL25" data available here
  #   https://pages.mysociety.org/2025-constituencies/datasets/geographic_overlaps/latest
  # which maps the 2010 ons/GSS ids to the mysociety ids. the mapping of my society ids
  # to the new ons/GSS ids is covered by the CSV data we are already using here,
  # though this code does not yet expose that column
  #
  attr_reader :file_name

  ID_KEY = "gss_code"
  NAME_KEY = "name"

  REQUIRED_INPUT_KEYS = [ ID_KEY , NAME_KEY ]

  def initialize(file_name)
    @file_name = file_name
    raise ArgumentError, "single argument file_name required" unless file_name && file_name != ""
  end

  def each
    CSV.foreach(file_name, headers: true, col_sep: ",") do |data|
      unless data.to_h.keys[4] == ID_KEY && data.to_h.keys[2] == NAME_KEY
        raise ArgumentError, "Input fields #{data.to_h.keys} do not match #{REQUIRED_INPUT_KEYS}"
      end

      data_transformed = {
        # ons_id: data.to_h.values[0], # don't ask ... data[ID_KEY] should have worked
        ons_id: data[ID_KEY],
        name: data[NAME_KEY]
      }

      yield data_transformed
    end
  end
end
