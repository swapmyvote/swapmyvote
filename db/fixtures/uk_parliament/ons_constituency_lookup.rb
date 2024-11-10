require_relative "constituencies_original_with_ons_csv"

# This facilitates the migration from the "old" constituency
# names (e.g. in table presently named "constituencies", now redundant)
# to the ONS ids used in the "new" constituency table
# (presently named "ons_constituencies").
# Since that migration has been completed, this is now redundant.

class OnsConstituencyLookup
  def lookup
    ons_ids_by_constituency_id
  end

  def find_by_id(constituency_id)
    ons_ids_by_constituency_id[constituency_id]
  end

  private def ons_ids_by_constituency_id
    # TODO: leave this here to give messages on failing migrations.
    # Maybe we should clean up migrations so rake db:migrate becomes possible again
    raise "FATAL: It is no longer possible to convert 'original' constituency to new constituency, db table has gone"
  end
end
