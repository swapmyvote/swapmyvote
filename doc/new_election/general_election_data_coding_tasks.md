# New Election - General Election Data and Coding Tasks

In general [db/fixtures/README](../../db/fixtures/README.md) can be a guide. If no other reference is given, it should be covered there. 

## Preparing data

### Switch to general election mode if need be

See [db/seeds.rb](../../db/seeds.rb) and [db/seeds_for_general_election.rb](../../db/seeds_for_general_election.rb) and edit.

### Constituencies

Consider if constituecies data needs an update. May be need for boundary changes. 

### Poll predictions from electoral calculus

We should either get an update, or find a way to hide the polls data from voters. Method hide_polls? in [app/helpers/application_helper.rb](../../app/helpers/application_helper.rb) should let us do it.

The text about whether electoral calculus data is a prediction or an election result may need to be adjusted in these two templates

  app/views/user/swaps/_list_potential_swaps.html.haml
  app/views/user/swaps/_swap_profile_inner.html.haml

### Tactical Voting Recommendations

Needs thorough review. We can't necessarily rely on the previous aggregator (LiveFromBrexit) giving us the same date in the same format from the same providers. We may need to find a way to hide this data. Or simply not load the data.

## Preparing database

In [doc/admin-guide.md](../admin-guide.md) see the last step 'Resetting Heroku database for a new election cycle'

