require_relative "../fixtures/ons_constituencies_csv"

class PopulateOnsConstituencies < ActiveRecord::Migration[5.2]
  def down
    # nothing to do, we're just ensuring the table is populated
  end

  def up_disabled
    expected_rows = OnsConstituency::NUMBER_OF_UK_CONSTITUENCIES

    return if OnsConstituency.count == expected_rows

    unless OnsConstituency.count.zero?
      raise "Your #{OnsConstituency.table_name} table has #{OnsConstituency.count} rows. " \
        "Unable to run this migration, it should be zero or #{expected_rows}"
    end

    ons_constituencies_csv = OnsConstituenciesCsv.new(
      "db/fixtures/Westminster_Parliamentary_Constituencies_December_2018" \
      "_Names_and_Codes_in_the_United_Kingdom.csv")

    ons_constituencies_csv.each do |constituency|
      cons = OnsConstituency.new(constituency)
      cons.save!
    end
  end
end
