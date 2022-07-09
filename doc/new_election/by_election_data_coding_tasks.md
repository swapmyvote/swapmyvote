# New Election - By Election Data and Coding Tasks

In general [db/fixtures/README](../../db/fixtures/README.md) can be a guide. If no other reference is given, it should be covered there.

## Preparing data

### Switch to by election mode if need be

See [db/seeds.rb](../../db/seeds.rb) and [db/seeds_for_general_election.rb](../../db/seeds_for_general_election.rb) and edit.

### YAML file

A yaml file needs to be prepared with all the party and constituency data. Previous yaml files should be a guide, for example see the commits for the By Election in 2020 and the files 

    db/seeds.rb
    db/fixtures/be2022/candidate.rb
    db/fixtures/be2022/party.rb
    spec/db/fixtures/be2022/candidate_spec.rb
    spec/db/fixtures/be2022/party_spec.rb
    db/fixtures/be2022.yml
    db/fixtures/be2022_yaml.rb
    spec/db/fixtures/be2022_yaml_spec.rb

### Poll predictions from electoral calculus

We should either get an update, or find a way to hide the polls data from voters. Method hide_polls? in [app/helpers/application_helper.rb](../../app/helpers/application_helper.rb) should let us do it. 

For a two party by-election, the method hide_polls? will automatically hide the polls (since they're not needed as selection criteria)

### Tactical Voting Recommendations

Needs thorough review. We can't necessarily rely on the previous aggregator (LiveFromBrexit) giving us the same date in the same format from the same providers. We may need to find a way to hide this data. Or simply not load the data.

## Preparing database

In [doc/admin-guide.md](../admin-guide.md) see the last step 'Resetting Heroku database for a new election cycle'

