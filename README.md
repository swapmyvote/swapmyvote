# Swap My Vote

Swap My Vote is a platform which allows voters to find a partner to
swap their vote with.  Rather than voting for their preferred minority
party in a constituency where a tactical vote is necessary or
worthwhile, a voter can find someone who will vote for their preferred
party somewhere where that vote makes sense, even under the [First
Past The Post voting
system](https://en.wikipedia.org/wiki/First-past-the-post_voting).  In
return, they will vote for their partners preferred party as a
tactical vote in their own constituency.

Swap My Vote ran a successful project in both the 2015, 2017 and 2019 UK
general elections at [www.swapmyvote.uk](https://www.swapmyvote.uk),
and is preparing to do the same for the 2024 general election too.

In the interests of transparency, all of the code that we have written
and used is available in this repository. We are in the process of
working out how to make this project sustainable, but providing an
open and welcoming community for continued developed will be
important. So please have a look at the
[Contributing](#contributing-to-swap-my-vote) and [Contact](#contact)
sections below if you'd like to help.

## Setting up Swap My Vote locally

You will need Ruby and [Yarn](https://yarnpkg.com/lang/en/docs/install/)
installed.

-   Clone this repository:

        git clone https://github.com/swapmyvote/swapmyvote.git

-   Install the necessary gems:

        bundle install

    If this fails with error messages that mention `pg` or PostgreSQL, then
    try instead:

        bundle install --without=production

    since the PostgreSQL database is not normally needed for local
    development (sqlite is used instead).

-   Install npm packages with Yarn:

        yarn install

    If you get an error similar to "The engine "node" is incompatible with this module" then
    you may need to update to a more recent version of [node.js](https://nodejs.org/en/download/).

-   Set up some credentials and other config variables in a
    `.env.development.local` file.  You can ask @aspiers for a copy of
    this file, or if you are using your own Facebook and Twitter apps
    for login then you can make it yourself by starting from a
    template:

        $ cp .env.example .env.development.local

    Now edit `.env.development.local` to contain the appropriate
    credentials.  These will get automatically loaded via the
    `dotenv-rails` gem.

-   Set up the database schema and populate it with constituency and
    poll data, as well as some test users accounts for local
    development.

        bundle exec rake db:setup

-   environment variables

    You will need to be aware  of two environment variables.

    * ELECTION_DATE needs to be set permanently to the date of the election in format YYYY-MM-DD. This has an impact on your local site
    * ELECTION_TYPE should preferably be set permanently to 'general' or 'g'. It's possible to omit this step, but the database will be queried more often if it is not set. It may also need to be set for rake db:seed to run correctly for a by-election.

-   Seed the database

    Put some default content into your database

        ELECTION_TYPE=(g or b) bundle exec rake db:seed

-   Run the application:

        # Ensure binding to localhost even if $HOST is set, so that
        # the URL is accepted by the facebook development app
        ELECTION_DATE=YY-MM-DD bundle exec rails server -b localhost

-   Open your browser to http://localhost:3000.

-   Run Guard during development to automatically run tests and do
    style linting:

        bundle exec guard

-   [`rspec-snapshot](https://github.com/levinmr/rspec-snapshot)` is
    used for some of the tests.  To update the snapshots, do:

        UPDATE_SNAPSHOTS=true bundle exec rspec

    or just for a subset of the tests:

        UPDATE_SNAPSHOTS=true bundle exec rspec spec/foo/bar

-   Database migrations

    When you pull from swapmyvotemaster and database migrations (files  in db/migrations) are included you'll need to run

        bundle exec rake db:migrate

    And for tests to keep running successful you'll also need to run

        bundle exec RAILS_ENV=test rake db:migrate

    The test database should be empty, do not run the seeds task against it, some tests will fail.

Note that in the development environment, emails are not sent but instead written
as files in the `tmp/mails/` subdirectory.

## Contributing to Swap my Vote

Any help would be well appreciated!

### Onboarding

Before we can accept contributions from you, please make sure you read
[the License section](#license) below and follow the required step.

### Deciding what to work on

Please take a look at the [GitHub
project](https://github.com/orgs/swapmyvote/projects/2/views/3).
Issues are sorted into milestones, and the items are roughly sorted by
priority descending, so a good place to start would be near the top.
If you can, please avoid tackling stuff in future milestones until the
current milestone is complete.

In addition, look out for issues labelled [`help
wanted`](https://github.com/swapmyvote/swapmyvote/labels/help%20wanted)
or [`easy`](https://github.com/swapmyvote/swapmyvote/labels/easy).

### Coordinating with the team

If an issue is already assigned, then probably someone is already
working on it or at least intending to.  If it's unassigned then
probably it's up for grabs.  However it's safer to ask in the issue
and/or in the Zulip `#general` chat channel before starting on
anything, to avoid accidentally duplicating effort.  Please email us
at the below address to request an invite to our Zulip chat server.

Our roadmap can be seen in our [list of
 milestones](https://github.com/swapmyvote/swapmyvote/milestones?direction=asc&sort=due_date).

### Submitting issues and pull requests

When submitting new issues or PRs, please remember to apply any
relevant labels.  Thanks!

## Documentation

Our docs are currently very thin on the ground, but you will find
a few things in the [`doc/` directory](doc/), in particular the
[admin guide](doc/admin-guide.md) which contains a cheatsheet for
administering a live site.

## Contact

You can contact us at hello@swapmyvote.uk.

## License

In order to help ensure that potential voter partners aren't split
across different otherwise identical vote swapping platforms in the
same country, we have decided to license the code for the time being
as follows:

> All Rights Reserved © Forward Democracy Limited.

[Issue #33](https://github.com/swapmyvote/swapmyvote/issues/33)
includes previous discussion which may clarify the motivation for
this decision.

Contributions to the code will be very gratefully received!  Please
first use [this
link](https://github.com/swapmyvote/swapmyvote/edit/master/.clabot?message=Add+%3CMY+GITHUB+USERNAME%3E+to+CLA&description=This+is+to+confirm+that+I+am+happy+for+any+rights+in+my%0Dcontributions+to+the+SwapMyVote+code+to+be+assigned+to+Forward%0DDemocracy+for+the+purposes+of+defending+and+promoting+democracy.)
to submit a pull request which adds your GitHub username to the
`.clabot` file.  It will auto-populate the commit message with a
statement that you agree to assign rights for your contributions to
Forward Democracy.

Once we merge this pull request, your GitHub username will be added to
our list of approved contributors, and any other pull requests from
you can then be accepted.  This puts us in a future-proof position
regarding copyright, e.g. it keeps the possibility to making some or
all of the codebase Open Source in the future.
