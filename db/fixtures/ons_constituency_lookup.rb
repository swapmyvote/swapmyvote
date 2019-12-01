require_relative "constituencies_original_with_ons_csv"

class OnsConstituencyLookup
  def lookup
    ons_ids_by_constituency_id
  end

  def find_by_id(constituency_id)
    ons_ids_by_constituency_id[constituency_id]
  end

  # rubocop:disable Metrics/MethodLength
  private def ons_ids_by_constituency_id
    return @ons_ids_by_constituency_id if defined?(@ons_ids_by_constituency_id)

    original_constituencies_with_ons_csv = OriginalConstituenciesWithOnsCsv
      .new("db/fixtures/constituency_original_names_with_ons_ids.csv")

    ons_ids_by_constituency_name = original_constituencies_with_ons_csv.each_with_object({}) do |c, hash|
      hash[c[:name]] = c[:ons_id]
    end
    # puts ons_ids_by_constituency_name.take(3).to_h.inspect

    valid_ons_ids = OnsConstituency.all.each_with_object(Set.new) do |c, set|
      set << c.ons_id
    end
    # puts valid_ons_ids.to_a.take(3).inspect

    @ons_ids_by_constituency_id = Constituency.all.each_with_object({ missed_name: [], missed_ons_id: [] }) do |c, hash|
      if ons_ids_by_constituency_name.key?(c.name)
        hash[c.id] = ons_id = ons_ids_by_constituency_name[c.name]
        unless valid_ons_ids.include?(ons_id)
          hash[:missed_ons_id] << ons_id
        end
      else
        hash[:missed_name] << c.name
      end
    end

    missed_name = @ons_ids_by_constituency_id[:missed_name]
    missed_ons_id = @ons_ids_by_constituency_id[:missed_ons_id]

    unless missed_name.count.zero?
      raise "#{missed_name.count} rows in #{Constituency.table_name} " \
        "table do not have matching name in mapping CSV #{missed_name}"
    end

    unless missed_ons_id.count.zero?
      raise "#{missed_ons_id.count} rows in #{Constituency.table_name} " \
        "table do not have matching ONS ids in ONS table #{OnsConstituency.table_name}: #{missed_ons_id}"
    end

    return @ons_ids_by_constituency_id
  end
end
