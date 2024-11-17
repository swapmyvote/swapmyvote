# Imported and fixture data for swapmyvote

## Constituencies (current)

The current db/seeds_for_general_election.rb uses MysocietyConstituenciesCsv from db/fixtures/mysociety_constituencies_csv.rb to load up to date constituencies data.

db/fixtures/mysociety_constituencies_csv.rb has the information about obtaining updates.

It will only update with boundary changes, not a regular event.

## Poll predictions option 1 - from movement foward

This is the option presently used by db/seeds_for_general_election.rb

See the code in MrpAveragesPolls (db/fixtures/mrp_averages_polls.rb) and the two ruby files that relies on.

The data in db/fixtures/mrp_averages.csv was obtained from Movement Forward.

## Poll predictions option 2 - from electoral calculus

This was updated at the time of the 2024 GE but in the event was not used live.

See commit https://github.com/swapmyvote/swapmyvote/commit/90ffeaa717cb0483851a062603932e82ff290f83 for how it was being used before being superseded.

electoral_calculus_constituencies.tsv should contain a copy-paste of the list of all
constituencies at <https://www.electoralcalculus.co.uk/orderedseats.html>

### Update process

The tsv is produced by copy and pasting the html table from the page
<https://www.electoralcalculus.co.uk/orderedseats.html>
into a spreadsheet, which must then be saved as tab-separated values.
This is straightforward in LibreOffice spreadsheets, and presumably in other tools too.

## Tactical Voting Recommendations

These scripts were custom written for every source of recommendations. See db/seeds*for_general_election.rb and the requires for various files db/fixtures/tactical_vote*\* . Each source has notes on how the data was obtained.

See PR https://github.com/swapmyvote/swapmyvote/pull/823 for a from scratch implemmentation of recommendation scripts and note the need to update the recommendations helper app/helpers/recommendations_helper.rb.

This particular update follows a typical pattern.

- db/fixtures/tactical_vote_getvoting.csv contains the csv obtained from the TV site
- db/fixtures/tactical_vote_getvoting_csv.rb is a simplistic wrapper around the CSV (allows for column changes in the source CSV without impacting other code), and also assigns an id used to identify the site in the DB and in the front-end
- db/fixtures/tactical_vote_getvoting_recs.rb maps the the data to the recommendations tables.

## Superseded data

constituency_locations.tsv should contain a copy-paste of the table on
Wikipedia of all constituencies, and their counties/countries.

constituencies.tsv originally was the source of constituency data, and came from
<https://www.electoralcalculus.co.uk/orderedseats.html>. Now that file and the
table presently named constituencies are both redundant.
