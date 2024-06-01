require "open-uri"
require "csv"
require "set"

# Example of use in terminal
# $ bundle exec rails c
# > require "./db/fixtures/electoral_commission_parties"
# > ElectoralCommissionParties.download
#
# > ecdata =  ElectoralCommissionParties.new
# > ecdata.find_by_name("Liberal Democrat")
# => {"ECRef"=>"PP90", "RegulatedEntityName"=>"Liberal Democrats", ...
#
# > uni = ecdata.unique_entities
# > uni["Labour Party"]
# => {:regulated_entity_name=>"Labour Party", :joint_description=>"Labour and Co-operative Party" ...
# > uni["Co-operative Party"]
# => {:regulated_entity_name=>"Co-operative Party", :joint_description=>"Labour and Co-operative Party" ...
# > uni["Conservative and Unionist Party"]
# => {: regulated_entity_name=>"Conservative and Unionist Party", :descriptions => ["Conservatives", "NI Conservatives"

module Db
  module Fixtures
    class ElectoralCommissionParties
      include Enumerable

      # wikipedia page at https://en.wikipedia.org/wiki/List_of_political_parties_in_the_United_Kingdom#cite_note-1
      # starts with http://search.electoralcommission.org.uk/Search/Registrations?currentPage=1&rows=10&sort=RegulatedEntityName&order=asc&et=pp&et=ppm&register=gb&register=ni&register=none&regStatus=registered
      # we have tacked on getDescriptions=true and adapted the link to point to the CSV download,
      # and not the html search page

      URL = "http://search.electoralcommission.org.uk/api/csv/Registrations?sort=RegulatedEntityName&order=asc&et=pp&et=ppm&register=gb&register=ni&register=none&regStatus=registered&getDescriptions=true"
      FILE = File.expand_path("./electoral_commission_parties.csv", __dir__)

      class << self
        def download
          # ec_parties_data_as_csv = URI.open(URL).read ruby 3.0 syntax
          ec_parties_data_as_csv = open(URL).read
          File.write(FILE, ec_parties_data_as_csv)
        end
      end

      # The EC has a concept of unique entities, so one parliamentary entity has a unique name,
      # even though it may have more than one registration (GB and NI) for that single name.
      # This returns a hash of those entities, with all their registered descriptions, and all registrations.
      # Also, joint descriptions are collected, so that parties in permanent alliance can be tracked.
      # Labour and Co-op for instance are returned as distinct
      # entities, which can be found to work together by matching their joint description.
      def unique_entities
        return @unique_entities if defined?(@unique_entities)
        @unique_entities = each_with_object({}) do  |party, result|
          name = party["RegulatedEntityName"]
          register = party["RegisterName"] || "(none)"
          description = party["Description"]
          result[name] ||= {}

          result[name][:regulated_entity_name] = name
          joint_match = description =~ /\(joint/i
          result[name][:joint_description] = description[0..(joint_match - 1)].strip if joint_match

          result[name][:registrations] ||= ::Set.new
          result[name][:registrations] << { "RegisterName" => register,  "ECRef" => party[:ec_ref] }
          result[name][:descriptions] ||= ::Set.new
          result[name][:descriptions] << description unless description.nil?
        end
      end

      # This is unique entities, but with parties with a permanent electoral alliance
      # (joint descriptions, e.g. Labour and Co-op) merged into one.
      # The name given to the merged/joint party is the joint description from the EC data.
      # Parties which do not represent merges keep the regulated entity name
      def unique_entities_joint_merged
        return @unique_entities_joint_merged if defined?(@unique_entities_joint_merged)
        @unique_entities_joint_merged = unique_entities.values.each_with_object({}) do  |party, result|
          name = party[:joint_description] || party[:regulated_entity_name]
          result[name] ||= {}

          result[name][:name] = name
          result[name][:regulated_entity_names] ||= []
          result[name][:regulated_entity_names] << party[:regulated_entity_name]
          result[name][:descriptions] ||= []
          result[name][:descriptions] += party[:descriptions].to_a
          result[name][:registrations] ||= []
          result[name][:registrations] += party[:registrations].to_a
        end
      end

      def find_by_name(name)
        ec_ref = index_ec_ref_by_name_or_description[name]
        return unless ec_ref
        index_by_ec_ref[ec_ref]
      end

      def each(&block)
        csv_data.each do |hash|
          block.call(hash)
        end
      end

      # Hash to enable lookup of a parties ECRef based on its resgistered name or registered description
      def index_ec_ref_by_name_or_description
        each_with_object({}) do |party, ec_ref_by_name|
          ec_ref = party[:ec_ref]
          name = party["RegulatedEntityName"]
          description = party["Description"]

          ec_ref_by_name[name] = ec_ref
          ec_ref_by_name[description] = ec_ref if description
        end
      end

      # Hash to enable registration entries for the party to be found from EC Ref. This gives a unique entity name
      def index_by_ec_ref
        each_with_object({}) do | party, parties_by_ec_ref |
          ec_ref = party[:ec_ref]
          parties_by_ec_ref[ec_ref] = party unless parties_by_ec_ref.key?(ec_ref)
        end
      end

      private def csv_data
        return @csv_data if defined?(@csv_data)
        @csv_data = []

        ::CSV.foreach(FILE, headers: true, col_sep: ",") do |data|
          # data_transformed = {
          #   ons_id: data.to_h.values[0], # don't ask ... data[ID_KEY] should have worked
          #   name: data[NAME_KEY],
          # }

          @csv_data << data.to_hash.merge(ec_ref: data[0]) # for some reason CSV gem doesn't get the first column  right
        end

        return @csv_data
      end
    end
  end
end
