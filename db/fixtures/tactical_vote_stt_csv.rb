# This encapsulates access to the tactical voting recommandations from StopTheTories.vote
# updates can be obtained from
# https://github.com/asibs/tactical-next/blob/main/public/data/latest.csv

require("csv")

class TacticalVoteSttCsv
  attr_reader :file_name, :site

  FILE_NAME = "db/fixtures/tactical_vote_stt.csv"

  ID_KEY = "Short Code"
  ADVICE_KEY = "TV Advice"

  REQUIRED_INPUT_KEYS = [ ID_KEY , ADVICE_KEY ]

  def initialize
    @file_name = FILE_NAME
    @site = "stop-the-tories"
  end

  def data
    return @data if defined?(@data)

    @data = []

    CSV.foreach(FILE_NAME, headers: true, col_sep: ",") do |line|
      unless line.to_h.keys[0] == ID_KEY && line.to_h.keys[56] == ADVICE_KEY
        raise ArgumentError, "Input fields #{line.to_h.keys} do not match #{REQUIRED_INPUT_KEYS}"
      end

      line_transformed = {
        mysoc_short_code: line[ID_KEY],
        advice: line[ADVICE_KEY]
      }

      data << line_transformed
    end

    return @data
  end
end
