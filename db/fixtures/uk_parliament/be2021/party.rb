require_relative "../be2021_yaml"
require_relative "candidate"

module Db
  module Fixtures
    module Be2021
      class Party
        class << self
          def all_with_duplicates
            Candidate.all.map do |candidate|
              {
                name: candidate[:party_name],
                colour: candidate[:colour]
              }
            end
          end

          def all
            all_with_duplicates.each_with_object([]) do |party, parties|
              matching_party = parties.detect { |existing_party| existing_party[:name] == party[:name] }
              parties << party unless matching_party
            end
          end
        end
      end
    end
  end
end
