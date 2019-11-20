require_relative '../../db/fixtures/constituencies_original_with_ons_csv'

namespace :constituencies_original do

  desc "match original constituency table to ons id"
  task :match_to_ons => :environment do

    original_constituencies_with_ons_csv = OriginalConstituenciesWithOnsCsv.new("db/fixtures/constituency_original_names_with_ons_ids.csv")

    ons_ids_by_constituency_name = original_constituencies_with_ons_csv.each_with_object({}) { |c, hash| hash[c[:name]] = c[:ons_id] }
    # puts ons_ids_by_constituency_name.take(3).to_h.inspect

    ons_ids_by_constituency_id = Constituency.all.each_with_object({misses: []}) do |c, hash|
      if ons_ids_by_constituency_name.key?(c.name)
        hash[c.id] = ons_ids_by_constituency_name[c.name]
      else
        hash[:misses] << c.name
      end
    end

    misses = ons_ids_by_constituency_id[:misses]

    unless misses.count.zero?
      raise "#{misses.count} rows in #{Constituency.table_name} table do not have matching ONS ids: #{misses}"
    end

    puts ons_ids_by_constituency_id.take(3).to_h.inspect
    # puts ons_ids_by_constituency_id.inspect

  end
end