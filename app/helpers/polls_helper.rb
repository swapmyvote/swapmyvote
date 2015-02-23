module PollsHelper
  def poll_data_for(constituency)
    data = []
    for poll in constituency.polls.sort_by {|p| p.votes}.reverse
      data.push [poll.party.name, poll.votes / 100, poll.party.color]
    end
    return data.to_json
  end
end
