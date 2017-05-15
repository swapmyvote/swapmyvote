Swap my Vote API
================

We currently have a single end point to pre-populate some of the fields that a user can choose:

http://www.swapmyvote.org/uk/swap

Parameters should be passed in the query string, e.g.

http://www.swapmyvote.uk/uk/swap?preferred_party_name=labour

Available parameters are:

* `preferred_party_name` - The party that the user would ideally like to vote for, say if all votes counted equally nationally.
* `willing_party_name` - The party that the user is willing to vote for, say tactically.

The party names should be lowercased and use underscores instead of spaces. We support 7 parties at the moment, with the follow canonical names on Swap my Vote:

* `labour`
* `green_party`
* `liberal_democrats`
* `conservatives`
* `snp`
* `ukip`
* `plaid cymru`