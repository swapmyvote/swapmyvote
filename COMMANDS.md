Expiring old swaps
------------------

    swaps = Swap.where({confirmed: false}).where(['created_at < ?', DateTime.now - 2.days])
    swaps.each {|s| s.destroy}

In demand users
---------------

    # If you run this in future, don't go back before this date. ('Thu, 30 Apr 2015 21:05:51 +0000')
    # d1 = DateTime.parse("2015-04-26 11:44:09.974550")
    # d1 = DateTime.parse("Thu, 30 Apr 2015 21:05:51 +0000")
    d1 = DateTime.parse("Sat, 02 May 2015 11:22:22 +0000")
    d2 = DateTime.now - 3.days
    users = User.where(["created_at < ? AND created_at > ?", d2, d1]).where.not({constituency_id: nil}).where.not({preferred_party_id: nil}).where.not({willing_party_id: nil})
    # Only pick the users that are in demand (more people want to vote for their willing party than preferred)
    users = users.reject {|u| !u.is_in_demand?}
    # Get rid of those that have swapped
    users = users.reject { |u| u.swap }
    # Reject blank emails
    users = users.reject { |u| u.email.blank? }

    # Check that in demand users look sane
    users.map {|u| [u.preferred_party.name, u.willing_party.name]}.group_by{|i| i}.map{|k,v| [k, v.count] }

    # Send emails
    users.each {|u| UserMailer.not_swapped_follow_up(u).deliver_now }

CSV of swapped users
--------------------

    ActiveRecord::Base.logger = nil; Swap.where(confirmed: true).each{|s| print "#{s.choosing_user.name},#{s.choosing_user.email},#{s.choosing_user.constituency.name},#{s.id}\n#{s.chosen_user.name},#{s.chosen_user.email},#{s.chosen_user.constituency.name},#{s.id}\n"}; nil

CSV of users
------------

    ActiveRecord::Base.logger = nil; print User.all.map {|u| [u.name, u.email].join("\t")}.join("\n")

CSV of unswapped users
----------------------

    ActiveRecord::Base.logger = nil; print User.all.select {|u| !u.swapped?}.map {|u| [u.name, u.email].join("\t")}.join("\n")

Run command in Heroku environment
---------------------------------

    heroku run --app swapmyvote CONFIG=value bash
    heroku run --app swapmyvote CONFIG=value rails runner 'COMMAND'

Open or close swaps in Heroku environment
-----------------------------------------

    # Set app mode to one of AppModeConcern::VALID_MODES
    heroku config:set -a swapmyvotedev SWAPMYVOTE_MODE=open
