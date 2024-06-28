# New Election - General Election Data and Coding Tasks

In general [db/fixtures/README](../../db/fixtures/README.md) can be a guide. If no other reference is given, it should be covered there. 

## Preparing data

### Switch to general election mode if need be

See [db/seeds.rb](../../db/seeds.rb) and optionally edit so that the default election type is general election. This can be overridden using an environment variable (ELECTION_TYPE=general), however, making the edit means other developers don't need to remember to use the environment variables.

### Constituencies

Consider if constituencies data needs an update. May be need for boundary changes.

### Poll predictions from electoral calculus

We should either get an update, or find a way to hide the polls data from voters. Method hide_polls? in [app/helpers/application_helper.rb](../../app/helpers/application_helper.rb) should let us do it.

The text about whether electoral calculus data is a prediction or an election result may need to be adjusted in these two templates

  app/views/user/swaps/_list_potential_swaps.html.haml
  app/views/user/swaps/_swap_profile_inner.html.haml

### Tactical Voting Recommendations

Tactical voting suggestions were hidden in [this commit](https://github.com/swapmyvote/swapmyvote/commit/52fcb7866e1bb98dd42372464f9dc7d691c76d3d) so reverting that would be a good start, if we decide we want this feature back.

But, this needs thorough review. We can't necessarily rely on the previous aggregator (LiveFromBrexit) giving us the same date in the same format from the same providers.

## Template changes

Should not be required. Text is switched automatically once the two environment variables are set, and rake db:seeds has been run.

## Preparing database

Whether on Heroku or your local dev environment, you will need to set two environment variables.

* ELECTION_DATE needs to be set permanently to the date of the election in format YYYY-MM-DD
* ELECTION_TYPE should preferably be set permanently to 'general' or 'g'. It's possible to omit this step, but the database will be queried more often if it is not set. It may also need to be set for rake db:seed to run correctly for a general election.

In [doc/admin-guide.md](../admin-guide.md) see the last step 'Resetting Heroku database for a new election cycle'
