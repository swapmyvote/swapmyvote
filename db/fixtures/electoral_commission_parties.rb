require "open-uri"
require "CSV"

class ElectoralCommissionParties
  include Enumerable

  # wikipedia page at https://en.wikipedia.org/wiki/List_of_political_parties_in_the_United_Kingdom#cite_note-1
  # starts with http://search.electoralcommission.org.uk/Search/Registrations?currentPage=1&rows=10&sort=RegulatedEntityName&order=asc&et=pp&et=ppm&register=gb&register=ni&register=none&regStatus=registered
  # we have tacked on getDescriptions=true and adapted the link to point to the CSV download, not the html search page

  URL = "http://search.electoralcommission.org.uk/api/csv/Registrations?sort=RegulatedEntityName&order=asc&et=pp&et=ppm&register=gb&register=ni&register=none&regStatus=registered&getDescriptions=true"
  FILE = File.expand_path("./electoral_commission_parties.csv", __dir__)

  class << self
    def download
      # ec_parties_data_as_csv = URI.open(URL).read ruby 3.0 syntax
      ec_parties_data_as_csv = open(URL).read
      File.write(FILE, ec_parties_data_as_csv)
    end
  end

  def each(&block)
    CSV.foreach(FILE, headers: true, col_sep: ",") do |data|
      # data_transformed = {
      #   ons_id: data.to_h.values[0], # don't ask ... data[ID_KEY] should have worked
      #   name: data[NAME_KEY],
      # }

      block.call(data.to_hash.merge(ec_ref: data[0])) # for some reason CSV gem doesn't get the first column  right
    end
  end

  def unique_index_by_ec_ref
    puts "unique_index_by_ec_ref"
    each_with_object({}) do | party, parties_by_ec_ref |
      ec_ref_name = party[:ec_ref]

      # puts party.keys.to_s

      # puts party.to_s

      # ref = party["ECRef"].to_s

      # puts "==ref==#{ref}===="

      # puts "==:my_data==#{party[:my_data]}===="

      # raise "kaboom"

      parties_by_ec_ref[ec_ref_name] = party
    end
  end

  def index_by_entity
    unique_index_by_ec_ref.each_with_object({}) do | (_ec_ref, party), parties_by_entity |
      entity_name = party["RegulatedEntityName"]

      parties_by_entity[entity_name] = [] unless parties_by_entity.has_key?(entity_name)

      parties_by_entity[entity_name] << party
    end
  end
end
