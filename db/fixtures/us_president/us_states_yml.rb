# This encapsulates access to the yaml file with the list of us states
#
# In the rails console
#     require './db/fixtures/us_states_yml'
#     states = UsStatesYml.new
#     states.data

require "yaml"

class UsStatesYml
  attr_reader :file_name

  FILE_NAME = "db/fixtures/us_president/us_states.yml"

  ID_KEY = "abbreviation"
  NAME_KEY = "name"

  REQUIRED_INPUT_KEYS = [ ID_KEY , NAME_KEY ]

  def initialize
    @file_name = FILE_NAME
  end

  private def raw_data
    ::YAML.load(file_content)
  end

  def file_content
    @file_content ||= ::File.read(@file_name)
  rescue Errno::ENOENT => e
    puts "Filename #{@file_name} read failed with error #{e}"
    raise e
  end

  def data
    return @data if defined?(@data)

    @data = []

    raw_data.each do |(_code, state)|
      line_transformed = {
        ons_id: state[ID_KEY],
        name: state[NAME_KEY]
      }

      data << line_transformed
    end

    return @data
  end
end
