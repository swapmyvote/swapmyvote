# Swap My Vote

Swap My Vote is a platform which allows voters to find a partner to
swap their vote with.  Rather than voting for their preferred minority
party in a constituency where a tactical vote is necessary or
worthwhile, a voter can find someone who will vote for their preferred
party somewhere where that vote makes sense, even under First Past The
Post. In return, they will vote for their partners preferred party as
a tactical vote in their own constituency.

Swap My Vote ran a successful project in both the 2015 and 2017 UK
general elections at [www.swapmyvote.uk](https://www.swapmyvote.uk).

In the interests of transparency, all of the code that we have written
and used is available in this repository. We are in the process of
working out how to make this project sustainable, but providing an
open and welcoming community for continued developed will be
important. So please have a look at the
[Contributing](#contributing-to-swap-my-vote) and [Contact](#contact)
sections below if you'd like to help.

## Setting up Swap My Vote locally

You will need Ruby installed.

-   Clone this repository:

        git clone https://github.com/swapmyvote/swapmyvote.git

-   Install the necessary gems:

        bundle install

    If this fails with error messages that mention `pg` or PostgreSQL, then
    try instead:

        bundle install --without-production

    since the PostgreSQL database is not normally needed for local
    development (sqlite is used instead).

-   Set up some credentials and other config variables in a
    `.env.development.local` file.  You can ask @aspiers for a copy of
    this file, or if you are using your own Facebook and Twitter apps
    for login then you can make it yourself

        $ cp .env.example .env.development.local

    Now edit `.env.development.local` to contain the appropriate
    credentials.  These will get automatically loaded via the
    `dotenv-rails` gem.

-   Set up the database schema and populate it with constituency and
    poll data, as well as some test users accounts for local
    development.

        bundle exec rake db:setup

-   Run the application:

        # Ensure binding to localhost even if $HOST is set, so that
        # the URL is accepted by the facebook development app
        bundle exec rails server -b localhost

-   Open your browser to http://localhost:3000.

-   Run Guard during development to automatically run tests and do
    style linting:

        bundle exec guard

Note that in the development environment, emails are not sent but instead written
as files in the `tmp/mails/` subdirectory.

## Contributing to Swap my Vote

Any help would be well appreciated. Please take a look at the [GitHub
project](https://github.com/orgs/swapmyvote/projects/1).  Issues are
sorted into milestones, and the items in
each column are roughly sorted by priority descending, so a good place
to start would be near the top of the `M0` column.  If you can, please
avoid tackling stuff in future milestones until the current milestone
is complete.

In addition, look out for issues labelled [`help
wanted`](https://github.com/swapmyvote/swapmyvote/labels/help%20wanted)
or [`easy`](https://github.com/swapmyvote/swapmyvote/labels/easy).

If an issue is already assigned, then probably someone is already
working on it or at least intending to.  If it's unassigned then
probably it's up for grabs.  However it's safer to ask in the issue
and/or in the Slack `#general` chat channel before starting on
anything, to avoid accidentally duplicating effort.  Please email us
at the below address to request an invite to our Slack chat server.

Our roadmap can be seen in our [list of
 milestones](https://github.com/swapmyvote/swapmyvote/milestones?direction=asc&sort=due_date).

When submitting new issues or PRs, please remember to apply any
relevant labels.  Thanks!

## Contact

You can contact us at hello@swapmyvote.uk.

## License

In order to help ensure that potential voter partners aren't split across different otherwise identical vote swapping platforms in the same country, we have decided to license the code for the time being as follows:

> All Rights Reserved © Forward Democracy Limited.

[Issue #33](https://github.com/swapmyvote/swapmyvote/issues/33)
includes previous discussion of this.

If you would like to contribute to the code, please first [submit
a pull request which adds your GitHub username to the `.clabot`
file](https://github.com/swapmyvote/swapmyvote/edit/master/.clabot?message=Add+%3CMY+GITHUB+USERNAME%3E+to+CLA&description=This+is+to+confirm+that+I+am+happy+for+any+rights+in+my%0Dcontributions+to+the+SwapMyVote+code+to+be+assigned+to+Forward%0DDemocracy+for+the+purposes+of+defending+and+promoting+democracy.).
