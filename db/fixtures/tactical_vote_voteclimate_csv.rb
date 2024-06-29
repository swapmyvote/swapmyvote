# This encapsulates access to the tactical voting recommendations from https://voteclimate.uk/
# updates can be obtained by email via Tom

require "csv"

class TacticalVoteVoteclimateCsv
  attr_reader :file_name, :site

  FILE_NAME = "db/fixtures/tactical_vote_voteclimate_29jun24.csv"

  ONS_ID_KEY = "id"
  ADVICE_KEY = "party_code"

  REQUIRED_INPUT_KEYS = [ ONS_ID_KEY , ADVICE_KEY ]

  def initialize
    @file_name = FILE_NAME
    @site = "vote-climate-uk"
  end

  def data
    return @data if defined?(@data)

    @data = []

    CSV.foreach(FILE_NAME, headers: true, col_sep: ",") do |line|
      unless line.to_h.keys[0] == ONS_ID_KEY && line.to_h.keys[3] == ADVICE_KEY
        raise ArgumentError, "Input fields #{line.to_h.keys} do not match #{REQUIRED_INPUT_KEYS}"
      end

      line_transformed = {
        constituency_ons_id: line[ONS_ID_KEY],
        advice: line[ADVICE_KEY]
      }

      data << line_transformed
    end

    return @data
  end
end
