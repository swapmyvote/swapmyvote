require_relative "../fixtures/uk_parliament/electoral_calculus_constituencies_tsv"

class RefreshPolls < ActiveRecord::Migration[5.2]
  def up_disabled
    # TODO: this code is currently duplicated in db/seeds.rb, and
    # doesn't correctly handle when there are no parties in the
    # database yet. So when performing the migration from a fresh
    # empty database, it breaks.  However it was previously useful
    # when migrating existing databases, so we keep the code disabled.

    polls_data = ElectoralCalculusConstituenciesTsv.new

    polls_data.each do |party_result|
      vote_count = (party_result[:vote_percent] * 100).to_i
      ons_id = party_result[:constituency_ons_id]
      party_id = party_result[:party_id]
      conversion_note = party_result[:conversion_note]

      unless conversion_note.nil?
        puts "\nConversion Note: #{party_result} "
      end

      poll = Poll.find_or_initialize_by constituency_ons_id: ons_id, party_id: party_id
      poll.votes = vote_count
      poll.save!
      print "."
    end

    puts
  end

  def down
    puts "If you really want to undo the refresh, then rollback, checkout the old code and run rake db:seed"
  end
end
