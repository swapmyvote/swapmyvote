module PollsHelper
  def poll_data_for(constituency)
    data = []
    constituency.polls.sort_by {|p| p.votes}.reverse.each do |poll|
      data.push [poll.party.short_name, poll.votes / 100, poll.party.color] unless poll.votes.zero?
    end
    return data.to_json.html_safe
  end
end
