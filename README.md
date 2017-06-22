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

## Setting up Swap my Vote locally.

You will need Ruby installed. 

Clone this repository:
```
git clone https://github.com/swapmyvote/swapmyvote.git
```

Install the necessary gems:
```
bundle install
```

Set up some config variables in a `.env` file, and add them to your environment:
```
$ cat .env
# You will need create a Facebook application to allow log-ins via Facebook. Provide the keys here.
export FACEBOOK_KEY=...
export FACEBOOK_SECRET=...
# You will need create a Twitter application to allow log-ins via Twitter. Provide the keys here.
export TWITTER_KEY=...
export TWITTER_SECRET=...
# Set a password to protect the admin area of the site.
export ADMIN_PASSWORD=...

$ source .env
```

Set up the database schema and populate it with constituency and poll data, as well as some test users accounts for local development.
```
rake db:migrate
rake db:seed
```

Run the application:
```
rails server
```

Open your browser to http://localhost:3000.

## Contributing to Swap my Vote

At the moment, there is only one developer working on Swap my Vote, so any help would be well appreciated. Please take a look at the open issues, and leave a comment if you're looking at one. Or get in contact at hello@swapmyvote.uk.

Our rough roadmap of things to work on before the next general election is:

* Allow users to perform detailed searches when looking for searches. I.e. filter by constituency, with preset defaults for marginals, local constituencies, target seats, etc.
* Rather than a single list of all parties we support, first find out the user's constituency, then show them the parties that are running in their constituency that they could vote for. This will allow us to include minor parties WEP, NHA, etc, as well as not clutter the list with parties like SNP, or Plaid Cymru who only stand in certain areas. This would also open support for Northern Irish parties.
* When asking who to they would like to vote for, now include all of the parties from above, but probably with the main parties at the top.
* Better on-boarding, where we walk the user through an explanation of the app, and gather their data.
* Better mobile support. At the moment the site is responsive, but very much feels like a web app, not a native app on mobile devices. Whether we can have one web app that works well on both, or need a more significant split of front-ends is an open question.
* Use post-code look up to let people find their constituency easily.
* Allow log-ins from non-Facebook and Twitter sources, but that still allows some form of establishing trust. Possibly with a phone number that can receive a text verification code. Voters could then text each other to get in touch after being paired.
* Move to a better source of constituency data, with ONS ID support, and regular automatic updates of polls. [and find better polling data?]
* Allow multiple swap requests at the same time.
* Allow 'pre-confirmed' swaps. I.e. a user could say 'if someone from Isle of Wight wants to vote Green, I'll do that', before there are actually any matching users.
* Show activity of users, so that inactive/abandoned users can be ignored by searching users.
* Don't delete unconfirmed/cancelled swaps, just flag them as cancelled so that we still have a record of what swaps were proposed.
* Automatically sync user data to Mailchimp for easily sending out batches of emails in the lead up to the election to remind people to swap/confirm/etc depending on their status.
* Confirm email address for users.
* Move away from email as main point of contact for some users - Facebook messages, texts, whatsapp? Emails have a tendency to be ignored/sent to junk. Can we do native mobile push notifications from a web based app somehow?
* An admin interface for updating the copy in the lifecycle emails we use as the election cycle goes on.
* Pages for each party and constituency that can be shared on Facebook. I.e. 'there are 20 voters willing to vote Labour in Exeter for you, would you like to swap with them?'

## License

TBD.

