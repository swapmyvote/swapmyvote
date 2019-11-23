require_relative '../../db/fixtures/ons_constituency_lookup'

namespace :constituencies_original do

  desc "match original constituency table to ons id"
  task :match_to_ons => :environment do

    ons_ids_by_constituency_id = OnsConstituencyLookup.new.lookup

    puts "Sample result:"
    puts ons_ids_by_constituency_id.take(5).to_h.inspect
    # puts ons_ids_by_constituency_id.inspect

  end
end