# This encapsulates access to the reference CSV for constituencies
# from mysociety
# Updates to the file can be obtained from
# https://pages.mysociety.org/2025-constituencies/datasets/parliament_con_2025/latestm

class MysocietyConstituenciesCsv
  # First shot at using mysociety_constituencies_csv
  # BUT
  # 1. the gss/ons ids are faked ones, none of them match the old ones
  #    (most of them should match for unchanged constituencies)
  # 2. some of them, the NI ones, are blank.

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