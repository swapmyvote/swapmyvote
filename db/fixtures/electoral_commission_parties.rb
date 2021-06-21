require "open-uri"
require "CSV"

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
# => {:unique_name=>"Labour Party", :joint_name=>"Labour and Co-operative Party" ...}

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

  def unique_entities
    each_with_object({}) do  |p, result|
      name = p["RegulatedEntityName"]
      register = p["RegisterName"]
      description = p["Description"]
      result[name] = {} if result[name].nil?
      result[name][:registrations] = {} if result[name][:registrations].nil?
      result[name][:registrations][register] = p
      result[name][:names] = Set.new if result[name][:names].nil?
      result[name][:names] << name
      result[name][:names] << description unless description.nil?
      result[name][:unique_name] = name
      joint_match = description =~ /\(joint/i
      result[name][:joint_name] = description[0..(joint_match - 1)].strip if joint_match
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

    CSV.foreach(FILE, headers: true, col_sep: ",") do |data|
      # data_transformed = {
      #   ons_id: data.to_h.values[0], # don't ask ... data[ID_KEY] should have worked
      #   name: data[NAME_KEY],
      # }

      @csv_data << data.to_hash.merge(ec_ref: data[0]) # for some reason CSV gem doesn't get the first column  right
    end

    return @csv_data
  end
end
