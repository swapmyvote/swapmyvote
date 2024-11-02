# Imported and fixture data for swapmyvote

## Constituencies (current)

Westminster_Parliamentary_Constituencies_December_2018_Names_and_Codes_in_the_United_Kingdom.csv
should contain a copy of the official ONS constituencies file downloaded from 
<https://geoportal.statistics.gov.uk/datasets/westminster-parliamentary-constituencies-december-2018-names-and-codes-in-the-united-kingdom>

### Update process

After downloading the new file and commiting it, create a new migration based on 
db/migrate/20191123112854_populate_ons_constituencies.rb

It will only update with boundary changes, not a regular event.

## Poll predictions from electoral calculus

electoral_calculus_constituencies.tsv should contain a copy-paste of the list of all
constituencies at <https://www.electoralcalculus.co.uk/orderedseats.html>

### Update process

The tsv is produced by copy and pasting the html table from the page
<https://www.electoralcalculus.co.uk/orderedseats.html>
into a spreadsheet, which must then be saved as tab-separated values.
This is straightforward in LibreOffice spreadsheets, and presumably in other tools too.

Commit the new file, then create a new migration based on a combination of 
db/migrate/20191126122621_refresh_polls.rb and
db/migrate/20191205084216_calculate_marginal_score.rb
since changing this data will affect the marginal score.

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
