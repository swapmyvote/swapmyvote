# boundary-change-issues

This page gives a rough guide to new, changing and dissappearing constituencies. Rough, because they don't always use the official names.

https://www.electoralcalculus.co.uk/boundaries2023.html

## Postcodes

(Issue created: https://github.com/swapmyvote/swapmyvote/issues/725 )

Current provider (api) is api.postcodes.io. That web pages says that they update based on ONS data, which we can be fairly certain will be late.

Postcode that should completely change (dissappearing -> new): OX26 2EW

Our current lookup (api.postcodes.io) gives Banbury

Electoral calculus gives: Bicester and Woodstock

https://12v.github.io/boundary-mapper/ gives Bicester and Woodstock

Postcode that is in a constituency that disappears:: LL57 1LH

Our lookup gives the old constituency: Arfon

Electoral calculus gives: Bangor Aberconwy

https://12v.github.io/boundary-mapper/ also gives Bangor Aberconwy

## New Constituency List - sources

(Issue created: https://github.com/swapmyvote/swapmyvote/issues/726 )

These can be almost guaranteed to have no ONS ids, certainly not for new constituencies.

### pages.mysociety.org (now)

https://pages.mysociety.org/2025-constituencies/datasets/parliament_con_2025/latest

Matching possibilities

| Column name | Data type | Description Unique                                                                                     | Required values |
| ----------- | --------- | ------------------------------------------------------------------------------------------------------ | --------------- |
| full_code   | string    | Unique identifier for the constituency, in the form uk.org.mysociety.cons.ukparl.2025.aad              | Yes             |
| short_code  | string    | Unique identifier for the constituency, in the form UKPARL.2025.AAD                                    | Yes             |
| name        | string    | Name of the constituency from the Boundary Commissions                                                 | Yes             |
| gss_code    | string    | Unique identifier for the constituency - Currently without NI                                          | No              |
| three_code  | string    | Rae and Brown 3 letter codes (http://www.statsmapsnpix.com/2023/07/a-new-uk-constituency-hex-map.html) | Yes             |

### github.com/12v/boundary-mapper (now)

https://github.com/12v/boundary-mapper/tree/main/output

Matching possibilties: Constituency name only.

### Democracy club (future)

## New Constituency List - Lack of ONS_ID

(Issue created: https://github.com/swapmyvote/swapmyvote/issues/727)

Means code adjustments in the following areas

- polls (predictions or past results, currently electoral calculus) are indexed partially by constituency_ons_id
- recommendations (TV) are indexed partially by constituency_ons_id
- users own constituency noted by by constituency_ons_id
- the API (for sites linking directly to swapmyvote) prepopulates the form based on ONS_ID
