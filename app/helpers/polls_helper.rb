module PollsHelper
  def poll_data_for(constituency)
    data = []
    for poll in constituency.polls
      data.push [poll.party.name, poll.votes, poll.party.color]
    end
    return data.to_json
  end
end
