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

Tactical voting suggestions were hidden in [this commit](https://github.com/swapmyvote/swapmyvote/commit/52fcb7866e1bb98dd42372464f9dc7d691c76d3d) so reverting that would be a good start, if we decide we want this feature back.

But, this needs thorough review. We can't necessarily rely on the previous aggregator (LiveFromBrexit) giving us the same date in the same format from the same providers.

## Template changes

This template has very chatty text giving the context of the election

    app/views/user_mailer/welcome_email.html.

Also in app/helpers/application_helper.rb the two methods election_event_title and election_hashtags need updating but could be automated depending on the constituencies defined in the database.

## Preparing database

In [doc/admin-guide.md](../admin-guide.md) see the last step 'Resetting Heroku database for a new election cycle'
