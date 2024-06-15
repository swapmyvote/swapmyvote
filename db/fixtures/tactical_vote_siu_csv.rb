# This encapsulates access to the tactical voting recommandations from www.scotlandinunion.co.uk
# update was sent by email

require "csv"

class TacticalVoteSiuCsv
  attr_reader :file_name, :site

  FILE_NAME = "db/fixtures/tactical_vote_siu.csv"

  ID_KEY = "Constituency"
  ADVICE_KEY = "SIU recommendation"

  REQUIRED_INPUT_KEYS = [ ID_KEY , ADVICE_KEY ]

  def initialize
    @file_name = FILE_NAME
    @site = "scotland-in-union"
  end

  def data
    return @data if defined?(@data)

    @data = []

    CSV.foreach(FILE_NAME, headers: true, col_sep: ",") do |line|
      unless line.to_h.keys[0] == ID_KEY && line.to_h.keys[1] == ADVICE_KEY
        raise ArgumentError, "Input fields #{line.to_h.keys} do not match #{REQUIRED_INPUT_KEYS}"
      end

      line_transformed = {
        mysoc_name: line[ID_KEY],
        advice: line[ADVICE_KEY]
      }

      data << line_transformed
    end

    return @data
  end
end
