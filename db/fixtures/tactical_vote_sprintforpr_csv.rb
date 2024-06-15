# This encapsulates access to the tactical voting recommendations from SprintForPR.uk
# updates can be obtained direct from the CSV download on https://www.sprintforpr.uk/plan

require("csv")

class TacticalVoteSprintforprCsv
  attr_reader :file_name, :site

  FILE_NAME = "db/fixtures/tactical_vote_sprintforpr.csv"

  NAME_KEY = "Constituency Name"
  ADVICE_KEY = "Tactical Voting Advice"

  REQUIRED_INPUT_KEYS = [ NAME_KEY , ADVICE_KEY ]

  def initialize
    @file_name = FILE_NAME
    @site = "sprint-for-pr"
  end

  def data
    return @data if defined?(@data)

    @data = []

    CSV.foreach(FILE_NAME, headers: true, col_sep: ",") do |line|
      unless line.to_h.keys[0] == NAME_KEY && line.to_h.keys[1] == ADVICE_KEY
        raise ArgumentError, "Input fields #{line.to_h.keys} do not match #{REQUIRED_INPUT_KEYS}"
      end

      line_transformed = {
        constituency_name: line[NAME_KEY],
        advice: line[ADVICE_KEY]
      }

      data << line_transformed
    end

    return @data
  end
end
