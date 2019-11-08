# frozen_string_literal: true

class OnsConstituenciesCsv
  attr_reader :file_name

  ID_KEY = 'PCON18CD'
  NAME_KEY = 'PCON18NM'

  REQUIRED_INPUT_KEYS = [ID_KEY, NAME_KEY].freeze

  def initialize(file_name)
    @file_name = file_name
    unless file_name && file_name != ''
      raise ArgumentError, 'single argument file_name required'
    end
  end

  def each
    CSV.foreach(file_name, headers: true, col_sep: ',') do |data|
      unless data.to_h.keys[0][1..-1] == ID_KEY && data.to_h.keys[1] == NAME_KEY
        raise ArgumentError, "Input fields #{data.to_h.keys} do not match #{REQUIRED_INPUT_KEYS}"
      end

      data_transformed = {
        ons_id: data.to_h.values[0], # don't ask ... data[ID_KEY] should have worked
        name: data[NAME_KEY]
      }

      yield data_transformed
    end
  end
end
