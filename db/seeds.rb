require_relative "../app/helpers/application_helper"

extend ApplicationHelper

institution = election_institution # invoke helper method

require_relative "fixtures/#{institution}/seeds"
