# This encapsulates access to the tactical voting recommendations from tactical.vote
# updates can be obtained by CSV download from https://tactical.vote/all/

require("csv")

class TacticalVoteTacticalVoteCsv
  attr_reader :file_name, :site

  FILE_NAME = "db/fixtures/tactical_vote_tacticalvote.csv"

  NAME_KEY = "Constituency Name"
  ADVICE_KEY = "Tactical Voting Advice"

  REQUIRED_INPUT_KEYS = [ NAME_KEY , ADVICE_KEY ]

  def initialize
    @file_name = FILE_NAME
    @site = "tactical-vote"
  end

  def data
    return @data if defined?(@data)

    @data = []

    CSV.foreach(FILE_NAME, headers: true, col_sep: ",") do |line|
      line_transformed = {
        constituency_name: line[1],
        advice: line[3]
      }

      data << line_transformed
    end

    return @data
  end
end
