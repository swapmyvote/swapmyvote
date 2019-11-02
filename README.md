# Swap my Vote

Swap my Vote is a platform which allows voters to find a partner to swap their vote with.
Rather than voting for their preferred minority party in a constituency where a tactical
vote is necessary or worthwhile, a voter can find someone who will vote for their preferred
party somewhere where that vote makes sense, even under First Past The Post. In return, they
will vote for their partners preferred party as a tactical vote in their own constituency.

Swap my Vote ran a successful project in both the 2015 and 2017 UK general elections at
[www.swapmyvote.uk](https://www.swapmyvote.uk).

In the interests of transparency, all of the code that we have written and used is available
in this open source repository. We are in the process of working out how to make this project
sustainable, but providing an open and welcoming community for continued developed will be
important. So please have a look at any open issues or get in touch at hello@swapmyvote.uk if you'd like to help.

## Setting up Swap my Vote locally

You will need Ruby installed.

Clone this repository:

    git clone https://github.com/swapmyvote/swapmyvote.git

Install the necessary gems:

    bundle install

Set up some config variables in a `.env` file, and add them to your environment.

    $ cp .env.example .env
    # Now edit .env to contain the appropriate credentials
    $ source .env

Set up the database schema and populate it with constituency and poll data, as well as some test users accounts for local development.

    rake db:migrate
    rake db:seed

Run the application:

    # Ensure binding to localhost even if $HOST is set, so that
    # the URL is accepted by the facebook development app
    rails server -b localhost

Open your browser to http://localhost:3000.

## Contributing to Swap my Vote

At the moment, there is only one developer working on Swap my Vote, so any help would be well appreciated. Please take a look at the open issues, and leave a comment if you're looking at one. Or get in contact at hello@swapmyvote.uk.

Our roadmap can be seen in our [GitHub project](https://github.com/orgs/swapmyvote/projects/1)
and [list of milestones](https://github.com/swapmyvote/swapmyvote/milestones?direction=asc&sort=due_date).

## License

TBD.
