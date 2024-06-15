# doc/recommendations_import

## data structure (planned)

### RecommendationSite

The tactical recommendation site.

Conceptual model only. Anticpate frequent changes to the ordering, site names in UI, site summary, site links.

So most of this will be kept in a helper (since UI related) in a hash keyed by 'site_id' which is an invented unique internal code, only needed to uniquely identify the site. It will be independent of domain name changes of the recommended site and of UI changes.

Present value in site IDs

- stop-the-tories
- sprint-for-pr
- tactical-vote

### Recommendation

Active record model

What the recommending site actually said in text, and our inferences from that, such as mapping to full party names.

Aim to keep duplication to a minimum, site_id should link to related info in the helper, such as links etc.

### RecommendedParty

Active record model

Where the recommending site text can be identified as a party in our database, this links to the party by id.

Aim to keep duplication to a minimum, site_id should link to related info in the helper, such as links etc.

## migration

Happening as part of [issue 773 - Annotate Swaps with parties in tactical vote recommendations](https://github.com/swapmyvote/swapmyvote/issues/773)

- [X] add new fields to data structure
- [X] update tactical.vote import to create Recommendation records for parties not in our database
- [X] update import scripts to populate new fields
- [X] update helpers and views to pick up data from new places
- [X] remove any now-rendundant fields
