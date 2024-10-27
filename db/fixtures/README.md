# Imported and fixture data for swapmyvote

## Constituencies (current)

Westminster_Parliamentary_Constituencies_December_2018_Names_and_Codes_in_the_United_Kingdom.csv
should contain a copy of the official ONS constituencies file downloaded from
<https://geoportal.statistics.gov.uk/datasets/westminster-parliamentary-constituencies-december-2018-names-and-codes-in-the-united-kingdom>

### Update process

After downloading the new file and commiting it, create a new migration based on
db/migrate/20191123112854_populate_ons_constituencies.rb

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

## Tactical Voting Recommendations from LiveFromBrexit

livefrombrexit_recommendations.json should contain the json from
<https://www.livefrombrexit.com/tacticals/data/recommendations.json>

### Update Process

After download, commit the new file, then create a migration based on
db/migrate/20191208113028_recommendations_refresh_dec08.rb

## Superseded data

constituency_locations.tsv should contain a copy-paste of the table on
Wikipedia of all constituencies, and their counties/countries.

constituencies.tsv originally was the source of constituency data, and came from
<https://www.electoralcalculus.co.uk/orderedseats.html>. Now that file and the
table presently named constituencies are both redundant.
