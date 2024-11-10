require_relative "../be2021_yaml"

module Db
  module Fixtures
    module Be2021
      class Candidate
        class << self
          def all
            Be2021Yaml.data[:constituencies].flat_map do |constituency|
              constituency[:candidates].map do |candidate|
                candidate.merge(constituency_ons_id: constituency[:ons_id])
              end
            end
          end
        end
      end
    end
  end
end
