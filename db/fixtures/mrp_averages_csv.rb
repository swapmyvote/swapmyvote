# This encapsulates access to the MVTFWD agregate polling data
# updates can be obtained by exporting the tab "MRPs Calc" as a csv from the shared google spreadsheet

require "csv"

class MrpAveragesCsv
  attr_reader :file_name

  FILE_NAME = "db/fixtures/mrp_averages.csv"

  # Keys are the headers expected in the CSV
  # values are SMV preferred names, and in the case of parties, the SMV party codes.
  REQUIRED_INPUT = {
    "Short Codes "   => :short_code,
    "Utility"        => nil,
    "MRP Poll Sheet" => :poll_sheet,
    "Con"            => :con,
    "Lab"            => :lab,
    "LD"             => :libdem,
    "Green"          => :green,
    "SNP"            => :snp,
    "PC"             => :plaid,
    "Reform"         => :reform
  }

  def initialize
    @file_name = FILE_NAME
  end

  # rubocop:disable Metrics/MethodLength
  def data
    return @data if defined?(@data)

    @data = []

    CSV.foreach(FILE_NAME, headers: true, col_sep: ",") do |line|
      messages = []
      line_transformed = {}

      REQUIRED_INPUT.keys.each_with_index do |key, index|
        if line.to_h.keys[index] != key
          messages.push "column #{index} expected to be #{key.inspect}, but was #{line.to_h.keys[index].inspect}"
        else
          smv_key = REQUIRED_INPUT[key]
          line_transformed[smv_key] = line.to_h[key] if smv_key
        end
      end

      if messages.count.positive?
        puts messages.join("\n")
        raise ArgumentError, "Cannot process CSV, unexpected data"
      end

      data << line_transformed if line_transformed[:poll_sheet] == "AVERAGE"
    end

    return @data
  end
end
