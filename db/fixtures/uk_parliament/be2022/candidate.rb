require_relative "../be2022_yaml"

module Db
  module Fixtures
    module Be2022
      class Candidate
        class << self
          def all
            Be2022Yaml.data[:constituencies].flat_map do |constituency|
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
