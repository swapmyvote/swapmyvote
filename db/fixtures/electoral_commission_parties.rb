require "open-uri"

class ElectoralCommissionParties

  # wikipedia page at https://en.wikipedia.org/wiki/List_of_political_parties_in_the_United_Kingdom#cite_note-1
  # starts with http://search.electoralcommission.org.uk/Search/Registrations?currentPage=1&rows=10&sort=RegulatedEntityName&order=asc&et=pp&et=ppm&register=gb&register=ni&register=none&regStatus=registered
  # we have tacked on getDescriptions=true and adapted the link to point to the CSV download, not the html search page

  URL = "http://search.electoralcommission.org.uk/api/csv/Registrations?sort=RegulatedEntityName&order=asc&et=pp&et=ppm&register=gb&register=ni&register=none&regStatus=registered&getDescriptions=true"
  FILE = File.expand_path('./electoral_commission_parties.csv', __dir__)

  class << self
    def download
      # ec_parties_data_as_csv = URI.open(URL).read ruby 3.0 syntax
      ec_parties_data_as_csv = open(URL).read
      File.write(FILE, ec_parties_data_as_csv)
    end
  end

end
